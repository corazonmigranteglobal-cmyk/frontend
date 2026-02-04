import { useCallback, useState } from "react";
import { createApiConn } from "../../../../helpers/api_conn_factory";
import { TERAPIA_ENDPOINTS } from "../../../../config/TERAPIA_ENDPOINTS";
import { useSession } from "../../../../app/auth/SessionContext";

/**
 * Hook para gestión de reservas de citas terapéuticas
 */
export function useBooking() {
    const { session } = useSession();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [bootstrapData, setBootstrapData] = useState(null);
    const [disponibilidad, setDisponibilidad] = useState([]);

    // Helper to get auth params from session
    const getAuthParams = useCallback(() => {
        if (!session?.user_id || !session?.id_sesion) {
            throw new Error("Usuario no autenticado");
        }
        return {
            p_actor_user_id: session.user_id,
            p_id_sesion: session.id_sesion,
        };
    }, [session]);

    /**
     * Construye un Date en HORA LOCAL a partir de fecha YYYY-MM-DD y hora HH:MM
     * Evita problemas de parseo / UTC (el famoso "Z") al convertir con toISOString().
     */
    const buildLocalDate = useCallback((fechaStr, horaStr) => {
        const [y, m, d] = String(fechaStr).split("-").map((x) => parseInt(x, 10));
        const [hh, mm] = String(horaStr).split(":").map((x) => parseInt(x, 10));
        return new Date(y, m - 1, d, hh, mm, 0, 0); // local time
    }, []);

    /**
     * Obtiene datos iniciales para booking: enfoques, productos, terapeutas, horarios
     */
    const getBookingBootstrap = useCallback(
        async (incluirHorarios = true) => {
            setLoading(true);
            setError(null);
            try {
                const authParams = getAuthParams();

                const payload = {
                    args: {
                        ...authParams,
                        p_incluir_horarios: incluirHorarios,
                    },
                };

                const res = await createApiConn(
                    TERAPIA_ENDPOINTS.BOOKING_BOOTSTRAP,
                    payload,
                    "POST",
                    session
                );

                if (!res.ok) {
                    throw new Error(res.message || "Error obteniendo datos de booking");
                }

                const data = res.data || {};
                setBootstrapData(data);
                return data;
            } catch (err) {
                const msg = err?.message || "Error al cargar opciones de booking";
                setError(msg);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [getAuthParams, session]
    );

    /**
     * Obtiene disponibilidad de horarios de un terapeuta específico
     */
    const getDisponibilidad = useCallback(
        async (idTerapeuta) => {
            if (!idTerapeuta) {
                setDisponibilidad([]);
                return [];
            }

            setLoading(true);
            setError(null);
            try {
                const authParams = getAuthParams();

                const payload = {
                    args: {
                        ...authParams,
                        p_id_usuario_terapeuta: idTerapeuta,
                    },
                };

                const res = await createApiConn(
                    TERAPIA_ENDPOINTS.HORARIOS_OBTENER_DISPONIBILIDAD,
                    payload,
                    "POST",
                    session
                );

                // API returns rows directly, not nested
                // Each row has: fecha, inicio, fin (ISO strings)
                const horarios = (res?.rows || []).map((h) => ({
                    ...h,
                    // Normalize fecha to date string (YYYY-MM-DD)
                    fecha: h.fecha ? h.fecha.split("T")[0] : null,
                    // Extract time from ISO datetime (shown in local time)
                    hora_inicio: h.inicio
                        ? new Date(h.inicio).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                        })
                        : null,
                    hora_fin: h.fin
                        ? new Date(h.fin).toLocaleTimeString("es-ES", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                        })
                        : null,
                    disponible: true, // All returned slots are available
                }));

                setDisponibilidad(horarios);
                return horarios;
            } catch (err) {
                const msg = err?.message || "Error al obtener disponibilidad";
                setError(msg);
                setDisponibilidad([]);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [getAuthParams, session]
    );

    /**
     * Registra una nueva cita
     */
    const registrarCita = useCallback(
        async ({
            idTerapeuta,
            idProducto,
            fecha,
            horaInicio,
            horaFin,
            notas = "",
        }) => {
            if (!idTerapeuta || !idProducto || !fecha || !horaInicio || !horaFin) {
                throw new Error("Faltan datos obligatorios para registrar la cita");
            }

            setLoading(true);
            setError(null);
            try {
                const authParams = getAuthParams();

                // Construir fechas EN HORA LOCAL (Bolivia) y convertir a ISO UTC.
                // Esto evita que se mande "13:00Z" cuando el usuario eligió 13:00 local.
                const inicioDate = buildLocalDate(fecha, horaInicio);
                const finDate = buildLocalDate(fecha, horaFin);

                const payload = {
                    args: {
                        ...authParams,
                        p_id_usuario_terapeuta: idTerapeuta,
                        p_id_usuario_paciente: authParams.p_actor_user_id,
                        p_id_producto: idProducto,
                        p_fecha: fecha,
                        p_inicio: inicioDate.toISOString(),
                        p_fin: finDate.toISOString(),
                        p_notas: notas,
                    },
                };

                const res = await createApiConn(
                    TERAPIA_ENDPOINTS.CITAS_REGISTRAR,
                    payload,
                    "POST",
                    session
                );

                const row = res?.rows?.[0];
                if (row?.status !== "ok") {
                    throw new Error(row?.message || "Error al registrar cita");
                }

                return row.data;
            } catch (err) {
                const msg = err?.message || "Error al registrar la cita";
                setError(msg);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [getAuthParams, session, buildLocalDate]
    );

    /**
     * Cancela (apaga) una cita existente
     */
    const cancelarCita = useCallback(
        async (idCita) => {
            if (!idCita) {
                throw new Error("ID de cita requerido");
            }

            setLoading(true);
            setError(null);
            try {
                const authParams = getAuthParams();

                const payload = {
                    args: {
                        ...authParams,
                        p_id_cita: idCita,
                    },
                };

                const res = await createApiConn(
                    TERAPIA_ENDPOINTS.CITAS_APAGAR,
                    payload,
                    "POST",
                    session
                );

                const row = res?.rows?.[0];
                if (row?.status !== "ok") {
                    throw new Error(row?.message || "Error al cancelar cita");
                }

                return true;
            } catch (err) {
                const msg = err?.message || "Error al cancelar la cita";
                setError(msg);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [getAuthParams, session]
    );

    /**
     * Actualiza el estado de una cita
     */
    const actualizarEstadoCita = useCallback(
        async (idCita, estado) => {
            if (!idCita || !estado) {
                throw new Error("ID de cita y estado requeridos");
            }

            setLoading(true);
            setError(null);
            try {
                const authParams = getAuthParams();

                const payload = {
                    args: {
                        ...authParams,
                        p_id_cita: idCita,
                        p_estado: estado,
                    },
                };

                const res = await createApiConn(
                    TERAPIA_ENDPOINTS.CITAS_ESTADO_ACTUALIZAR,
                    payload,
                    "POST",
                    session
                );

                const row = res?.rows?.[0];
                if (row?.status !== "ok") {
                    throw new Error(row?.message || "Error al actualizar estado");
                }

                return row.data;
            } catch (err) {
                const msg = err?.message || "Error al actualizar el estado de la cita";
                setError(msg);
                throw err;
            } finally {
                setLoading(false);
            }
        },
        [getAuthParams, session]
    );

    return {
        loading,
        error,
        bootstrapData,
        disponibilidad,

        getBookingBootstrap,
        getDisponibilidad,
        registrarCita,
        cancelarCita,
        actualizarEstadoCita,
    };
}
