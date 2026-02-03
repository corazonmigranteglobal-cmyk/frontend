import { useEffect, useMemo, useState } from "react";
import { listarSolicitudes } from "../services/services.api";
import { mapSolicitudToUI } from "../mappers/solicitud.mapper";

export function useSolicitudes(session) {
    const [query, setQuery] = useState("");
    const [solicitudes, setSolicitudes] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");

    useEffect(() => {
        let alive = true;

        async function load() {
            setLoading(true);
            setLoadError("");

            try {
                const payload = {
                    p_id_sesion: session?.id_sesion,
                    p_actor_user_id: session?.user_id,
                    p_limit: 50,
                    p_offset: 0,
                };

                const resp = await listarSolicitudes(payload);

                if (resp?.ok !== true) {
                    throw new Error(resp?.message || "No se pudo cargar solicitudes");
                }

                const arr = Array.isArray(resp?.rows) ? resp.rows : [];
                const mapped = arr.map(mapSolicitudToUI);

                if (!alive) return;

                setSolicitudes(mapped);
                setSelectedId(mapped[0]?.id ?? null);
            } catch (e) {
                if (!alive) return;
                setLoadError(e?.message || "Error cargando solicitudes");
            } finally {
                if (alive) setLoading(false);
            }
        }

        if (session?.id_sesion) load();
        return () => (alive = false);
    }, [session?.id_sesion, session?.user_id]);

    const selected = useMemo(
        () => solicitudes.find((s) => s.id === selectedId) || solicitudes[0] || null,
        [selectedId, solicitudes]
    );

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return solicitudes;
        return solicitudes.filter((s) =>
            [s.nombre, s.id, s.ref].some((x) => String(x).toLowerCase().includes(q))
        );
    }, [query, solicitudes]);

    return {
        query,
        setQuery,
        solicitudes,
        setSolicitudes,
        selectedId,
        setSelectedId,
        selected,
        filtered,
        loading,
        loadError,
    };
}
