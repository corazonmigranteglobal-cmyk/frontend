import { useEffect, useMemo, useRef, useState } from "react";
import { createApiConn } from "../../../../helpers/api_conn_factory";
import { USUARIOS_ENDPOINTS } from "../../../../config/USUARIOS_ENDPOINTS";
import {
  mapTerapeutaPerfilFromSession,
  mapTerapeutaPerfilToUI,
} from "../mappers/terapeutaPerfil.mapper";

function resolveUserType(session) {
  if (!session) return { type: null, reason: "NO_SESSION" };

  const isTerapeuta = Boolean(session?.is_terapeuta);
  const isAdminLike = Boolean(
    session?.is_admin || session?.is_super_admin || session?.is_accounter
  );

  if (isTerapeuta) return { type: "terapeuta", reason: null };
  if (isAdminLike) return { type: "admin", reason: null };

  return { type: null, reason: "NO_ROLE" };
}

function safeStr(v) {
  return v === undefined || v === null ? "" : String(v);
}

function extractApiPayloadFromResponse(res) {
  const row = res?.rows?.[0];
  if (!row || typeof row !== "object") return null;
  const key = Object.keys(row).find(
    (k) => k.startsWith("api_usuario_") && k.endsWith("_obtener")
  );
  if (!key) return null;
  return row?.[key] || null;
}

const DEFAULT_PROFILE = {
  email: "",
  nombres: "",
  apellidos: "",
  telefono: "",
  fecha_nacimiento: "",
  sexo: "Femenino",
  titulo_profesional: "",
  especialidad_principal: "",
  descripcion: "",
  frase_personal: "",
  youtube_link: "",
  matricula_profesional: "",
  valor_sesion_base: "",
  pais: "",
  ciudad: "",
  foto_url: "",
};

export function useTerapeutaPerfilAdmin(session, opts = {}) {
  const { type: userType } = useMemo(() => resolveUserType(session), [session]);
  const targetUserId = useMemo(() => {
    if (opts?.targetUserId) return opts.targetUserId;

    if (userType === "admin") return session?.id_terapeuta || null;
    if (userType === "terapeuta") return session?.user_id || null;
    return null;
  }, [opts?.targetUserId, session?.id_terapeuta, session?.user_id, userType]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  const [pendingFotoFile, setPendingFotoFile] = useState(null);
  const [pendingFotoObjectUrl, setPendingFotoObjectUrl] = useState("");
  const [fotoDirty, setFotoDirty] = useState(false);

  const [saving, setSaving] = useState(false);

  const initialRef = useRef(null);

  const isDirty = useMemo(() => {
    if (!initialRef.current) return false;
    const a = initialRef.current;
    const b = profile;
    const keys = Object.keys(DEFAULT_PROFILE);
    return keys.some((k) => safeStr(a?.[k]) !== safeStr(b?.[k]));
  }, [profile]);

  const setField = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const fetchPerfil = async () => {
    if (userType === "terapeuta") {
      const next = mapTerapeutaPerfilFromSession(session);
      setProfile((prev) => ({ ...prev, ...next }));
      initialRef.current = { ...DEFAULT_PROFILE, ...next };
      return;
    }

    // Caso admin: traer al terapeuta gestionado.
    if (!session?.user_id || !session?.id_sesion) return;
    if (!targetUserId) {
      setError("Sesión sin id_terapeuta. No se puede obtener el terapeuta gestionado.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = USUARIOS_ENDPOINTS.OBTENER_TERAPEUTA;

      const payload = {
        p_actor_user_id: session.user_id,
        p_id_sesion: session.id_sesion,

        p_user_id: targetUserId,
      };

      const res = await createApiConn(endpoint, payload, "PATCH", session);

      const apiPayload = extractApiPayloadFromResponse(res);
      if (!apiPayload?.data) {
        throw new Error(
          "Respuesta inesperada: no se encontró api_usuario_*_obtener.data"
        );
      }

      const next = mapTerapeutaPerfilToUI(apiPayload.data, {
        email: session?.email,
        nombres: session?.nombre,
      });

      setProfile((prev) => ({ ...prev, ...next }));
      initialRef.current = { ...DEFAULT_PROFILE, ...next };
    } catch (e) {
      console.error("[useTerapeutaPerfilAdmin.fetchPerfil]", e);
      setError(e?.message || "No se pudo cargar el perfil");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user_id, session?.id_sesion, session?.id_terapeuta, targetUserId, userType]);

  function findFirstHttpUrl(obj) {
    try {
      if (!obj) return null;
      if (typeof obj === "string") {
        const s = obj.trim();
        return s.startsWith("http") ? s : null;
      }
      if (Array.isArray(obj)) {
        for (const it of obj) {
          const hit = findFirstHttpUrl(it);
          if (hit) return hit;
        }
      }
      if (typeof obj === "object") {
        for (const k of Object.keys(obj)) {
          const hit = findFirstHttpUrl(obj[k]);
          if (hit) return hit;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  // Seleccionar foto: preview instantáneo, NO sube nada.
  const selectFoto = (file) => {
    if (!file) return;

    // revoke previo
    try {
      if (pendingFotoObjectUrl) URL.revokeObjectURL(pendingFotoObjectUrl);
    } catch {
      // noop
    }

    const tempUrl = URL.createObjectURL(file);
    setPendingFotoFile(file);
    setPendingFotoObjectUrl(tempUrl);
    setFotoDirty(true);

    // preview en UI
    setProfile((prev) => ({ ...prev, foto_url: tempUrl }));
  };

  const clearPendingFoto = () => {
    try {
      if (pendingFotoObjectUrl) URL.revokeObjectURL(pendingFotoObjectUrl);
    } catch {
      // noop
    }
    setPendingFotoFile(null);
    setPendingFotoObjectUrl("");
    setFotoDirty(false);
  };

  const buildPatch = (p) => {
    // OJO: keys deben coincidir con lo que espera tu backend
    return {
      titulo_profesional: safeStr(p?.titulo_profesional).trim() || null,
      especialidad_principal: safeStr(p?.especialidad_principal).trim() || null,
      descripcion_perfil: safeStr(p?.descripcion).trim() || null,
      frase_personal: safeStr(p?.frase_personal).trim() || null,
      link_video_youtube: safeStr(p?.youtube_link).trim() || null,
      matricula_profesional: safeStr(p?.matricula_profesional).trim() || null,
      pais: safeStr(p?.pais).trim() || null,
      ciudad: safeStr(p?.ciudad).trim() || null,
      sexo: safeStr(p?.sexo).trim() || null,
      foto_perfil_link: safeStr(p?.foto_url || p?.avatar_url || p?.link || p?.foto),
      valor_sesion_base:
        p?.valor_sesion_base === "" || p?.valor_sesion_base === null || p?.valor_sesion_base === undefined
          ? null
          : Number(p.valor_sesion_base),
    };
  };

  // Guardar cambios (con o sin archivo)
  const save = async () => {
    if (!session?.user_id || !session?.id_sesion) throw new Error("Sesión inválida");
    if (!targetUserId) throw new Error("No se pudo resolver el terapeuta objetivo");

    setSaving(true);
    setError(null);

    try {
      const p_patch = buildPatch(profile);

      // 1) Si se modificó foto => endpoint con archivo
      if (pendingFotoFile) {
        const endpoint = String(USUARIOS_ENDPOINTS.TERAPEUTA_ACTUALIZAR_CON_ARCHIVO || "")
          .replace(":user_id", String(targetUserId));

        if (!endpoint) {
          throw new Error("Endpoint TERAPEUTA_ACTUALIZAR_CON_ARCHIVO no configurado");
        }

        const args = {
          p_actor_user_id: session.user_id,
          p_id_sesion: session.id_sesion,
          p_user_id: targetUserId,
          p_patch,
        };

        const formData = new FormData();
        formData.append("file", pendingFotoFile);
        formData.append("args", JSON.stringify(args));

        const resp = await createApiConn(endpoint, formData, "PATCH", session);
        if (resp?.ok === false) {
          throw new Error(resp?.message || "No se pudo actualizar el terapeuta");
        }

        // limpia pendiente (la foto ya quedó persistida)
        clearPendingFoto();

        // intenta actualizar foto_url si el backend devuelve URL
        const url = findFirstHttpUrl(resp);
        if (url) setProfile((prev) => ({ ...prev, foto_url: url }));

        // recargar para consistencia total
        await fetchPerfil();
        return resp;
      }

      // 2) Sin foto => endpoint normal
      const endpoint = USUARIOS_ENDPOINTS.UPDATE_USUARIOS_TERAPEUTA;
      if (!endpoint) throw new Error("Endpoint UPDATE_USUARIOS_TERAPEUTA no configurado");

      const payload = {
        p_actor_user_id: session.user_id,
        p_id_sesion: session.id_sesion,
        p_user_id: targetUserId,
        p_patch,
      };

      const resp = await createApiConn(endpoint, payload, "PATCH", session);
      if (resp?.ok === false) {
        throw new Error(resp?.message || "No se pudo actualizar el terapeuta");
      }

      await fetchPerfil();
      return resp;
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    error,
    profile,
    setProfile,
    setField,
    isDirty,
    refresh: fetchPerfil,
    userType,
    targetUserId,
    // foto
    selectFoto,
    fotoDirty,
    // save
    save,
    saving,
  };
}
