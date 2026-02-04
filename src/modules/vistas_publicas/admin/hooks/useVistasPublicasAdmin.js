import { useCallback, useEffect, useMemo, useState } from "react";
import { createApiConn } from "../../../../helpers/api_conn_factory";
import { API_URL } from "../../../../config/API_URL";
import { UI_ENDPOINTS } from "../../../../config/UI_ENDPOINTS";
import { FILE_SERVER_NAME } from "../../../../config/FILES_SERVER_NAMES";

function formatBytes(bytes) {
    const b = Number(bytes) || 0;
    if (b < 1024) return `${b} B`;
    const kb = b / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    const gb = mb / 1024;
    return `${gb.toFixed(1)} GB`;
}

export function useVistasPublicasAdmin(session) {
    // ---------------- FORM (panel editor)
    const [selectedView, setSelectedView] = useState("Vista externa");

    // Estos campos se llenan al editar (pluma)
    const [title, setTitle] = useState(""); // lo usamos como "Código"
    const [description, setDescription] = useState(""); // lo usamos como "Valor"
    const [isVisible, setIsVisible] = useState(true);
    const [file, setFile] = useState(null);

    // guardar (panel editor)
    const [saveLoading, setSaveLoading] = useState(false);
    const [saveError, setSaveError] = useState("");

    // ---------------- UI ELEMENTS (tabla dinámica)
    const [uiComponents, setUiComponents] = useState([]);
    const [uiLoading, setUiLoading] = useState(false);
    const [uiError, setUiError] = useState("");

    const [uiLimit, setUiLimit] = useState(10);
    const [uiOffset, setUiOffset] = useState(0);
    const [uiHasNext, setUiHasNext] = useState(false);

    // elemento seleccionado para editar
    const [editingUiElement, setEditingUiElement] = useState(null);

    // ---------------- FILES (explorador de carpetas)
    const [filesPrefix, setFilesPrefix] = useState("");
    const [serverDirs, setServerDirs] = useState([]);
    const [selectedUploadDir, setSelectedUploadDir] = useState("");
    const [filesLoading, setFilesLoading] = useState(false);
    const [filesError, setFilesError] = useState("");

    // ---------------- FILES (tabla de archivos: descargar / eliminar)
    const [serverFiles, setServerFiles] = useState([]);
    const [isDeletingFile, setIsDeletingFile] = useState(false);
    const [isDownloadingFile, setIsDownloadingFile] = useState(false);

    // Último guardado exitoso (para modal/toast)
    const [lastSaveOk, setLastSaveOk] = useState(null);

    // ---------------- ENDPOINT: LIST UI ELEMENTS
    const listUiComponents = useCallback(
        async ({ limit = uiLimit, offset = uiOffset } = {}) => {
            if (!session) return;

            setUiLoading(true);
            setUiError("");

            try {
                const payload = {
                    p_actor_user_id: session?.user_id ?? session?.id_usuario ?? session?.id ?? null,
                    p_id_sesion: session?.id_sesion ?? session?.session_id ?? session?.sesion_id ?? null,
                    p_limit: limit,
                    p_offset: offset,
                };

                const res = await createApiConn(UI_ENDPOINTS.UI_ELEMENTO_LISTAR, payload, "POST", session);

                const rows = Array.isArray(res?.rows) ? res.rows : [];

                const mapped = rows.map((r) => ({
                    id: r?.id_elemento ?? r?.id ?? null,
                    page: r?.nombre_pagina ?? "",
                    type: r?.tipo ?? "",
                    code: r?.metadata?.cod ?? "",
                    value: r?.valor ?? "",
                    link: r?.link ?? null,
                    raw: r,
                }));

                setUiComponents(mapped);

                setUiHasNext(rows.length === limit);
                setUiLimit(limit);
                setUiOffset(offset);
            } catch (err) {
                console.error("[UI_ELEMENTO_LISTAR] error:", err);
                setUiComponents([]);
                setUiHasNext(false);
                setUiError("No se pudo cargar la lista de elementos UI.");
            } finally {
                setUiLoading(false);
            }
        },
        [session, uiLimit, uiOffset]
    );

    // ---------------- CLICK EDIT (pluma) => carga al panel
    const startEditUiElement = useCallback((row) => {
        setEditingUiElement(row || null);

        setTitle(row?.code ?? "");
        setDescription(row?.value ?? "");

        setFile(null);
        setIsVisible(true);
    }, []);

    const stopEditUiElement = useCallback(() => {
        setEditingUiElement(null);
        setTitle("");
        setDescription("");
        setIsVisible(true);
        setFile(null);
    }, []);

    // ---------------- FILES: LIST DIRECTORIOS
    const listDirs = useCallback(
        async ({ prefix = filesPrefix } = {}) => {
            if (!session) return;

            setFilesLoading(true);
            setFilesError("");

            try {
                const payload = {
                    storage: FILE_SERVER_NAME,
                    ...(prefix ? { prefix } : {}),
                };
                const res = await createApiConn(UI_ENDPOINTS.FILES_LIST, payload, "GET", session);

                const items = Array.isArray(res?.items) ? res.items : [];

                const paths = items
                    .map((it) => it.path || it.objectName || "")
                    .filter(Boolean);

                const base = prefix || "";
                const baseNorm = base && !base.endsWith("/") ? `${base}/` : base;

                // Para comparar con object names (GCS/S3), quitamos "/" inicial
                const baseCompare = String(baseNorm).replace(/^\/+/, "");

                const directFolders = new Set();
                for (const pRaw of paths) {
                    const p = String(pRaw || "").replace(/^\/+/, "");
                    if (!p) continue;

                    // Si el backend devuelve paths absolutos: landing_page/media/...
                    // Si devuelve paths relativos (tu caso): media/...
                    const rest =
                        baseCompare && p.startsWith(baseCompare)
                            ? p.slice(baseCompare.length)
                            : p;

                    const seg = rest.split("/")[0];
                    if (!seg) continue;

                    // Mantener el formato del prefix original (con "/" inicial si lo tenías)
                    directFolders.add(`${baseNorm}${seg}/`);
                }

                const mapped = Array.from(directFolders)
                    .sort((a, b) => a.localeCompare(b))
                    .map((folderPath) => {
                        const name = folderPath
                            .replace(baseNorm, "")
                            .replace(/\/$/, "")
                            .split("/")
                            .pop();
                        return {
                            id: folderPath,
                            path: folderPath,
                            name: name || folderPath,
                        };
                    });

                setServerDirs(mapped);
            } catch (err) {
                console.error("[FILES_LIST] error:", err);
                setServerDirs([]);
                setFilesError("No se pudo cargar la estructura de carpetas.");
            } finally {
                setFilesLoading(false);
            }
        },
        [session, filesPrefix]
    );

    // ---------------- FILES: LIST ARCHIVOS (para la tabla: descargar / eliminar)
    const listFiles = useCallback(
        async ({ prefix = filesPrefix } = {}) => {
            if (!session) return;

            setFilesLoading(true);
            setFilesError("");

            try {
                const payload = {
                    storage: FILE_SERVER_NAME,
                    ...(prefix ? { prefix } : {}),
                };

                const res = await createApiConn(UI_ENDPOINTS.FILES_LIST, payload, "GET", session);
                const items = Array.isArray(res?.items) ? res.items : [];

                const mapped = items
                    .map((it) => {
                        const path = it.path || it.objectName || "";
                        if (!path || path.endsWith("/")) return null;
                        const name = path.split("/").pop() || path;
                        return {
                            id: path,
                            path,
                            name,
                            size: formatBytes(it.size),
                            raw: it,
                        };
                    })
                    .filter(Boolean);

                setServerFiles(mapped);
            } catch (err) {
                console.error("[FILES_LIST] error (files):", err);
                setServerFiles([]);
                setFilesError("No se pudo cargar la lista de archivos.");
            } finally {
                setFilesLoading(false);
            }
        },
        [session, filesPrefix]
    );

    const downloadFile = useCallback(
        async (fileRow) => {
            if (!session) return;
            const targetPath = String(fileRow?.path || "");
            if (!targetPath) return;

            setIsDownloadingFile(true);
            try {
                const qs = new URLSearchParams({
                    storage: FILE_SERVER_NAME,
                    path: targetPath,
                }).toString();

                const url = `${API_URL}/${UI_ENDPOINTS.FILES_DOWNLOAD}?${qs}`;

                const r = await fetch(url, {
                    method: "GET",
                    headers: {
                        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
                    },
                });

                if (!r.ok) {
                    const msg = await r.text().catch(() => "");
                    throw new Error(msg || `Error ${r.status}`);
                }

                const blob = await r.blob();
                const objectUrl = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = objectUrl;
                a.download = fileRow?.name || targetPath.split("/").pop() || "download.bin";
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(objectUrl);
            } finally {
                setIsDownloadingFile(false);
            }
        },
        [session]
    );

    const deleteFile = useCallback(
        async (targetPath) => {
            if (!session) return;
            const p = String(targetPath || "");
            if (!p) return;

            setIsDeletingFile(true);
            try {
                const payload = { storage: FILE_SERVER_NAME, targetPath: p };
                await createApiConn(UI_ENDPOINTS.FILES_DELETE, payload, "DELETE", session);
                await listFiles({ prefix: filesPrefix });
            } finally {
                setIsDeletingFile(false);
            }
        },
        [session, filesPrefix, listFiles]
    );

    // Navegación
    const openDir = useCallback(
        async (dirPath) => {
            const next = String(dirPath || "");
            setFilesPrefix(next);
            await listDirs({ prefix: next });
            await listFiles({ prefix: next });
        },
        [listDirs, listFiles]
    );

    const goUpDir = useCallback(
        async () => {
            const cur = String(filesPrefix || "");
            if (!cur) {
                await listDirs({ prefix: "" });
                await listFiles({ prefix: "" });
                return;
            }
            const trimmed = cur.endsWith("/") ? cur.slice(0, -1) : cur;
            const parts = trimmed.split("/").filter(Boolean);
            parts.pop();
            const parent = parts.length ? `${parts.join("/")}/` : "";
            setFilesPrefix(parent);
            await listDirs({ prefix: parent });
            await listFiles({ prefix: parent });
        },
        [filesPrefix, listDirs, listFiles]
    );

    const selectUploadDir = useCallback((dirPath) => {
        setSelectedUploadDir(String(dirPath || ""));
    }, []);

    // ---------------- SAVE (Guardar vista pública)
    const saveEditingUiElement = useCallback(async () => {
        if (!session) return { ok: false, error: "NO_SESSION" };
        if (!editingUiElement) return { ok: false, error: "NO_ELEMENT" };

        setSaveLoading(true);
        setSaveError("");

        try {
            const actorId = session?.user_id ?? session?.id_usuario ?? session?.id ?? null;
            const sesionId = session?.id_sesion ?? session?.session_id ?? session?.sesion_id ?? null;

            const raw = editingUiElement?.raw || {};
            const idElemento = raw?.id_elemento ?? editingUiElement?.id ?? null;
            const idPagina = raw?.id_pagina ?? null;
            const tipo = String(raw?.tipo ?? editingUiElement?.type ?? "").trim();

            const cod = String(title || raw?.metadata?.cod || editingUiElement?.code || "").trim();
            const valor = description ?? null;

            if (!actorId || !sesionId) throw new Error("Sesión inválida: falta p_actor_user_id o p_id_sesion.");
            if (!idElemento) throw new Error("No se encontró id_elemento del registro seleccionado.");
            if (!idPagina) throw new Error("No se encontró id_pagina del registro seleccionado.");
            if (!cod) throw new Error("El código (Título) es obligatorio.");

            const args = {
                p_actor_user_id: actorId,
                p_id_sesion: sesionId,
                p_id_elemento: idElemento,
                p_id_pagina: idPagina,
                p_cod_elemento: cod,
                p_tipo: tipo,
                p_valor: valor,
                p_metadata: raw?.metadata ?? {},
            };

            let res;

            // Si hay archivo seleccionado => endpoint nuevo
            if (file) {
                if (!selectedUploadDir) {
                    throw new Error("Selecciona una carpeta destino en el explorador de carpetas (botón USAR).");
                }

                const fd = new FormData();
                fd.append("file", file);
                fd.append(
                    "args",
                    JSON.stringify({
                        ...args,
                        storageKey: FILE_SERVER_NAME,
                        storage: FILE_SERVER_NAME,
                        targetDir: selectedUploadDir,
                    })
                );

                // createApiConn debe soportar FormData en POST (sin JSON headers)
                res = await createApiConn(
                    UI_ENDPOINTS.UI_ELEMENTO_EDITAR_CON_ARCHIVO,
                    fd,
                    "POST",
                    session
                );
            } else {
                // Sin archivo => endpoint normal
                res = await createApiConn(UI_ENDPOINTS.UI_ELEMENTO_EDITAR, args, "POST", session);
            }

            if (!res?.ok) {
                throw new Error(res?.message || "No se pudo guardar el elemento.");
            }

            // ✅ Guardamos info para modal de éxito
            setLastSaveOk({
                message: res?.message || "Cambios registrados con éxito.",
                data: res?.data || null,
            });

            // refresh
            await listUiComponents({ limit: uiLimit, offset: uiOffset });
            await listDirs({ prefix: filesPrefix });
            await listFiles({ prefix: filesPrefix });
            stopEditUiElement();

            return res; // ✅ retorna el JSON real (para tu SuccessModal)
        } catch (err) {
            console.error("[UI_ELEMENTO_GUARDAR] error:", err);
            setSaveError(err?.message || "No se pudo guardar.");
            return { ok: false, error: "SAVE_FAILED", message: err?.message || "No se pudo guardar." };
        } finally {
            setSaveLoading(false);
        }
    }, [
        session,
        editingUiElement,
        title,
        description,
        file,
        selectedUploadDir,
        filesPrefix,
        uiLimit,
        uiOffset,
        listUiComponents,
        listDirs,
        listFiles,
        stopEditUiElement,
    ]);

    // ---------------- INIT
    useEffect(() => {
        if (!session) return;
        listDirs({ prefix: "" });
        listFiles({ prefix: "" });
        listUiComponents({ limit: uiLimit, offset: 0 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session]);

    // ---------------- PAGINATION HELPERS UI
    const uiPage = useMemo(() => Math.floor(uiOffset / uiLimit) + 1, [uiOffset, uiLimit]);

    const uiNext = useCallback(() => {
        if (!uiHasNext || uiLoading) return;
        const nextOffset = uiOffset + uiLimit;
        listUiComponents({ limit: uiLimit, offset: nextOffset });
    }, [uiHasNext, uiLoading, uiOffset, uiLimit, listUiComponents]);

    const uiPrev = useCallback(() => {
        if (uiLoading) return;
        const prevOffset = Math.max(0, uiOffset - uiLimit);
        listUiComponents({ limit: uiLimit, offset: prevOffset });
    }, [uiLoading, uiOffset, uiLimit, listUiComponents]);

    const uiChangeLimit = useCallback(
        (nextLimit) => {
            const lim = Number(nextLimit) || 10;
            listUiComponents({ limit: lim, offset: 0 });
        },
        [listUiComponents]
    );

    return {
        // panel editor
        selectedView,
        setSelectedView,
        title,
        setTitle,
        description,
        setDescription,
        isVisible,
        setIsVisible,
        file,
        setFile,

        saveLoading,
        saveError,
        saveEditingUiElement,

        // ui table
        uiComponents,
        uiLoading,
        uiError,
        listUiComponents,
        uiLimit,
        uiOffset,
        uiHasNext,
        uiPage,
        uiNext,
        uiPrev,
        uiChangeLimit,

        // edit selection
        editingUiElement,
        startEditUiElement,
        stopEditUiElement,

        // files (explorador de carpetas)
        filesPrefix,
        serverDirs,
        selectedUploadDir,
        filesLoading,
        filesError,
        listDirs,

        // files (tabla)
        serverFiles,
        listFiles,
        isDeletingFile,
        isDownloadingFile,
        deleteFile,
        downloadFile,
        openDir,
        goUpDir,
        selectUploadDir,

        // éxito
        lastSaveOk,
        setLastSaveOk,
    };
}
