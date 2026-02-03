import { useCallback, useMemo, useState } from "react";
import { createApiConn } from "../../../../../helpers/api_conn_factory";
import { USUARIOS_ENDPOINTS } from "../../../../../config/USUARIOS_ENDPOINTS";

function normalizeList(value) {
  // Permite que UI use texto separado por comas o saltos de línea
  const s = String(value || "").trim();
  if (!s) return [];
  return s
    .split(/[,\n]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

function assertDbOk(res) {
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

export function usePacienteAuth({ initialMode } = {}) {
  const startMode = initialMode === "login" ? "login" : "register";
  const [mode, setMode] = useState(startMode); // "register" | "login"

  const [registerForm, setRegisterForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    telefono: "",
    sexo: "",
    fecha_nacimiento: "",
    pais: "",
    ciudad: "",
    ocupacion: "",
    motivo_consulta: "",
    sintomas_principales: "",
    objetivos: "",
    modalidad: "online",
    horario: "",
  });

  const [loginForm, setLoginForm] = useState({ email: "", password: "" }); // placeholder (si luego conectas login)
  const [confirm, setConfirm] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const openConfirm = useCallback((payload) => setConfirm(payload), []);
  const closeConfirm = useCallback(() => setConfirm(null), []);
  const closeResult = useCallback(() => setResult(null), []);

  const setRegisterField = useCallback((k, v) => setRegisterForm((s) => ({ ...s, [k]: v })), []);
  const setLoginField = useCallback((k, v) => setLoginForm((s) => ({ ...s, [k]: v })), []);

  const goRegister = useCallback(() => setMode("register"), []);
  const goLogin = useCallback(() => setMode("login"), []);

  const submitRegister = useCallback(() => {
    openConfirm({
      title: "Crear cuenta",
      message: "Se creará tu cuenta y se enviará un PIN de verificación al correo. ¿Deseas continuar?",
      confirmText: "Registrarme",
      onConfirm: async () => {
        closeConfirm();
        setLoading(true);
        try {
          const payload = {
            p_email: String(registerForm.email || "").trim(),
            p_password: String(registerForm.password || ""),
            p_nombre: String(registerForm.nombre || "").trim(),
            p_apellido: String(registerForm.apellido || "").trim(),
            p_telefono: String(registerForm.telefono || "").trim(),
            p_sexo: String(registerForm.sexo || "").trim(),
            p_fecha_nacimiento: String(registerForm.fecha_nacimiento || "").trim(),
            p_pais: String(registerForm.pais || "").trim(),
            p_ciudad: String(registerForm.ciudad || "").trim(),
            p_ocupacion: String(registerForm.ocupacion || "").trim(),
            p_perfil_psicologico: {
              motivo_consulta: String(registerForm.motivo_consulta || "").trim(),
              sintomas_principales: normalizeList(registerForm.sintomas_principales),
              objetivos: normalizeList(registerForm.objetivos),
              preferencias: {
                modalidad: String(registerForm.modalidad || "").trim(),
                horario: String(registerForm.horario || "").trim(),
              },
            },
            p_pin_life_time: "00:10:00",
            p_pin_contexto: "signup_paciente",
            p_pin_metadata: {
              source: "web",
              device: "web",
              notes: "signup paciente",
            },
          };

          const res = await createApiConn(
            USUARIOS_ENDPOINTS.REGISTRAR_PACIENTE,
            payload,
            "POST"
          );

          const okRes = assertDbOk(res);
          const r0 = Array.isArray(okRes?.rows) ? okRes.rows[0] : null;

          setResult({
            kind: "success",
            title: "Registro exitoso",
            message: r0?.message || "Paciente registrado correctamente. Se ha enviado un PIN de verificación.",
            data: r0?.data || null,
          });

          // opcional: cambiar a login después del registro
          setMode("login");
        } catch (err) {
          setResult({
            kind: "error",
            title: "No se pudo registrar",
            message: err?.message || "Error al registrar paciente",
            data: err?.data || null,
          });
        } finally {
          setLoading(false);
        }
      },
    });
  }, [openConfirm, closeConfirm, registerForm]);

  const submitLogin = useCallback(() => {
    openConfirm({
      title: "Iniciar sesión",
      message: "Este login aún no está conectado en este módulo. Usa el login del portal público.",
      confirmText: "Entendido",
      onConfirm: async () => {
        closeConfirm();
        setResult({
          kind: "info",
          title: "Login",
          message: "Usa el botón de Login del portal público.",
        });
      },
    });
  }, [openConfirm, closeConfirm]);

  const bgUrl = useMemo(
    () =>
      "https://storage.googleapis.com/vistas_publicas_assets/global_assets/media/landing_hero_migrante_1.jpeg",
    []
  );

  return {
    mode,
    goRegister,
    goLogin,

    registerForm,
    setRegisterField,
    submitRegister,

    loginForm,
    setLoginField,
    submitLogin,

    confirm,
    result,
    loading,
    closeConfirm,
    closeResult,

    bgUrl,
  };
}
