import { useCallback, useEffect, useMemo, useState } from "react";
import { createApiConn } from "../../../../helpers/api_conn_factory";
import { CONTABILIDAD_ENDPOINT } from "../../../../config/CONTABILIDAD_ENDPOINT";

function assertDbOk(res) {
    // A veces el backend devuelve HTTP 200 con ok=true pero status="error" dentro de rows[0]
    if (res?.ok === false) {
        throw new Error(res?.message || "Operación fallida");
    }
    const r0 = Array.isArray(res?.rows) ? res.rows[0] : null;
    if (r0?.status && String(r0.status).toLowerCase() !== "ok") {
        const err = new Error(r0?.message || "Operación fallida");
        err.data = res;
        throw err;
    }
    return res;
}

function mapCuentaRow(r) {
    return {
        id_cuenta: r.id_cuenta,
        nombre: r.nombre ?? "",
        codigo: r.codigo ?? "",
        id_grupo_cuenta: r.id_grupo_cuenta ?? null,
        grupo_cuenta_nombre: r.grupo_cuenta_nombre ?? "",
        tipo_cuenta: r.tipo_cuenta ?? "",
        sub_tipo: r.sub_tipo ?? "",
        categoria: r.categoria ?? "",
        moneda: r.moneda ?? "",
        register_status: r.register_status ?? "Activo",
        // estos campos pueden venir solo en crear/editar
        metadata: r.metadata ?? null,
        created_at: r.created_at ?? null,
        updated_at: r.updated_at ?? null,
        id_version: r.id_version ?? null,
    };
}

function getActorPayload(session) {
    return {
        p_actor_user_id: session?.user_id ?? session?.usuario_id ?? session?.id_user ?? session?.id_usuario,
        p_id_sesion: session?.id_sesion,
    };
}

// ------------------------------
// Session cache (sessionStorage)
// ------------------------------
const CACHE_NS = "cm_contabilidad_cache_v1";
const CACHE_ENTITY = "cuentas";

function getCacheKey(session) {
    const idSesion = session?.id_sesion;
    return idSesion ? `${CACHE_NS}:${idSesion}` : null;
}

function safeReadCache(key) {
    if (!key) return null;
    try {
        const raw = sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function safeWriteCache(key, cacheObj) {
    if (!key) return;
    try {
        sessionStorage.setItem(key, JSON.stringify(cacheObj));
    } catch {
        // ignore quota/serialization errors
    }
}

function ensureEntityCache(key) {
    const base = safeReadCache(key) || {};
    if (!base?.[CACHE_ENTITY]?.byId) {
        base[CACHE_ENTITY] = { byId: {} };
        safeWriteCache(key, base);
    }
    return base;
}

function upsertCacheRow(key, id, row) {
    if (!id) return;
    const base = ensureEntityCache(key);
    base[CACHE_ENTITY].byId[String(id)] = row;
    safeWriteCache(key, base);
}

function getCachedById(key) {
    const base = ensureEntityCache(key);
    return base?.[CACHE_ENTITY]?.byId || {};
}

export function useCuentasAdmin(session, { autoFetch = true, limit = 200 } = {}) {
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const cacheKey = useMemo(() => getCacheKey(session), [session?.id_sesion]);

    // crea la clave en sessionStorage apenas exista la sesión (para que se vea en DevTools)
    useEffect(() => {
        if (!cacheKey) return;
        ensureEntityCache(cacheKey);
    }, [cacheKey]);

    const fetchCuentas = useCallback(
        async ({ offset = 0 } = {}) => {
            const endpoint = CONTABILIDAD_ENDPOINT?.CUENTA_LISTAR;
            if (!endpoint) {
                setError("Endpoint CUENTA_LISTAR no está definido en CONTABILIDAD_ENDPOINT.");
                return;
            }
            if (!session?.id_sesion) {
                setError("No hay sesión activa (id_sesion faltante). ");
                return;
            }

            setIsLoading(true);
            setError("");
            try {
                const payload = {
                    ...getActorPayload(session),
                    p_limit: limit,
                    p_offset: offset,
                };

                const res = assertDbOk(await createApiConn(endpoint, payload, "POST", session));

                const list = Array.isArray(res?.rows) ? res.rows : [];
                const mapped = list.map(mapCuentaRow);

                // Overlay con cache de sesión: muestra inmediatamente cambios exitosos
                const cachedById = cacheKey ? getCachedById(cacheKey) : {};
                const seen = new Set();
                const merged = mapped.map((r) => {
                    const id = String(r.id_cuenta);
                    seen.add(id);
                    const c = cachedById?.[id];
                    return c ? { ...r, ...c } : r;
                });
                // agrega filas que solo estén en cache (creadas/actualizadas recientemente)
                for (const [id, c] of Object.entries(cachedById || {})) {
                    if (!seen.has(String(id))) merged.unshift(c);
                }
                setRows(merged);
            } catch (e) {
                setError(e?.message || "Error al listar cuentas");
            } finally {
                setIsLoading(false);
            }
        },
        [session, limit, cacheKey]
    );

    const crearCuenta = useCallback(
        async (cuenta) => {
            const endpoint = CONTABILIDAD_ENDPOINT?.CUENTA_CREAR;
            if (!endpoint) throw new Error("Endpoint CUENTA_CREAR no definido");
            if (!session?.id_sesion) throw new Error("Sesión inválida (id_sesion faltante)");

            const payload = {
                ...getActorPayload(session),
                p_nombre: cuenta.nombre,
                p_id_grupo_cuenta: cuenta.id_grupo_cuenta,
                p_codigo: cuenta.codigo,
                p_tipo_cuenta: cuenta.tipo_cuenta,
                p_sub_tipo: cuenta.sub_tipo,
                p_categoria: cuenta.categoria,
                p_moneda: cuenta.moneda,
                p_metadata: cuenta.metadata ?? {},
            };

            const res = assertDbOk(await createApiConn(endpoint, payload, "POST", session));
            const r0 = Array.isArray(res?.rows) ? res.rows[0] : null;
            const cuentaResp = r0?.data?.cuenta;
            if (cuentaResp?.id_cuenta) {
                const mapped = mapCuentaRow(cuentaResp);
                if (cacheKey) upsertCacheRow(cacheKey, mapped.id_cuenta, mapped);
                setRows((prev) => {
                    const idx = prev.findIndex((x) => x.id_cuenta === mapped.id_cuenta);
                    if (idx >= 0) {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], ...mapped };
                        return copy;
                    }
                    return [mapped, ...prev];
                });
            }
            return res;
        },
        [session, cacheKey]
    );

    const editarCuenta = useCallback(
        async (cuenta) => {
            const endpoint = CONTABILIDAD_ENDPOINT?.CUENTA_EDITAR;
            if (!endpoint) throw new Error("Endpoint CUENTA_EDITAR no definido");
            if (!session?.id_sesion) throw new Error("Sesión inválida (id_sesion faltante)");

            const payload = {
                ...getActorPayload(session),
                p_id_cuenta: cuenta.id_cuenta,
                p_nombre: cuenta.nombre,
                p_id_grupo_cuenta: cuenta.id_grupo_cuenta,
                p_codigo: cuenta.codigo,
                p_tipo_cuenta: cuenta.tipo_cuenta,
                p_sub_tipo: cuenta.sub_tipo,
                p_categoria: cuenta.categoria,
                p_moneda: cuenta.moneda,
                p_register_status: cuenta.register_status ?? "Activo",
                // Importante: el endpoint listar no devuelve metadata, si enviamos {} se sobre-escribe.
                // Dejamos undefined si no se tocó metadata (JSON.stringify omitirá el campo).
                p_metadata: cuenta.metadata,
            };

            const res = assertDbOk(await createApiConn(endpoint, payload, "POST", session));
            const r0 = Array.isArray(res?.rows) ? res.rows[0] : null;
            const cuentaResp = r0?.data?.cuenta;
            if (cuentaResp?.id_cuenta) {
                const mapped = mapCuentaRow(cuentaResp);
                if (cacheKey) upsertCacheRow(cacheKey, mapped.id_cuenta, mapped);
                setRows((prev) => prev.map((x) => (x.id_cuenta === mapped.id_cuenta ? { ...x, ...mapped } : x)));
            }
            return res;
        },
        [session, cacheKey]
    );

    const apagarCuenta = useCallback(
        async (cuenta) => {
            const endpoint = CONTABILIDAD_ENDPOINT?.CUENTA_ELIMINAR;
            if (!endpoint) throw new Error("Endpoint CUENTA_ELIMINAR no definido");
            if (!session?.id_sesion) throw new Error("Sesión inválida (id_sesion faltante)");

            const payload = {
                ...getActorPayload(session),
                p_id_cuenta: cuenta.id_cuenta,
                p_register_status: "Inactivo",
            };

            const res = assertDbOk(await createApiConn(endpoint, payload, "POST", session));
            const r0 = Array.isArray(res?.rows) ? res.rows[0] : null;
            const cuentaResp = r0?.data?.cuenta;
            if (cuentaResp?.id_cuenta) {
                const mapped = mapCuentaRow(cuentaResp);
                // en apagar, normalmente register_status cambia a Inactivo
                if (cacheKey) upsertCacheRow(cacheKey, mapped.id_cuenta, mapped);
                setRows((prev) => prev.map((x) => (x.id_cuenta === mapped.id_cuenta ? { ...x, ...mapped } : x)));
            }
            return res;
        },
        [session, cacheKey]
    );

    useEffect(() => {
        if (!autoFetch) return;
        if (!session?.id_sesion) return;
        fetchCuentas();
    }, [autoFetch, session?.id_sesion, fetchCuentas]);

    const byId = useMemo(() => {
        const m = new Map();
        for (const r of rows) m.set(r.id_cuenta, r);
        return m;
    }, [rows]);

    return {
        rows,
        byId,
        isLoading,
        error,
        fetchCuentas,
        crearCuenta,
        editarCuenta,
        apagarCuenta,
        setRows,
        setError,
    };
}
