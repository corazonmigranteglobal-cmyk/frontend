import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../../../../app/auth/SessionContext";
import { useBooking } from "../hooks/useBooking";
import { useSolicitudesCitaPaciente } from "../hooks/useSolicitudesCitaPaciente";

import { createApiConn } from "../../../../helpers/api_conn_factory";
import { TERAPIA_ENDPOINTS } from "../../../../config/TERAPIA_ENDPOINTS";

/**
 * Dashboard del paciente autenticado
 * - Lista de solicitudes/citas (tabla)
 * - Acceso rápido a agendar nueva cita
 * - Botón para cancelar cita/solicitud
 */
export default function PacienteDashboard() {
    const navigate = useNavigate();
    const { session, logout } = useSession();

    const { bootstrapData, loading: loadingBootstrap, error: errorBootstrap, getBookingBootstrap } =
        useBooking();

    // Tabla de solicitudes/citas
    const [pageSize, setPageSize] = useState(10);
    const [offset, setOffset] = useState(0);

    // Filtro de estado
    const [estadoFilter, setEstadoFilter] = useState("TODOS");

    // Cancelación
    const [cancelingId, setCancelingId] = useState(null);

    const {
        rows: solicitudes,
        isLoading: loadingSolicitudes,
        error: errorSolicitudes,
        fetchSolicitudes,
    } = useSolicitudesCitaPaciente({ autoFetch: false, limit: pageSize, offset });

    useEffect(() => {
        getBookingBootstrap(false).catch(() => { });
    }, [getBookingBootstrap]);

    useEffect(() => {
        if (!session?.user_id || !session?.id_sesion) return;

        fetchSolicitudes({
            p_limit: pageSize,
            p_offset: offset,
            p_id_usuario_paciente: session.user_id,
        }).catch(() => { });
    }, [session?.user_id, session?.id_sesion, pageSize, offset, fetchSolicitudes]);

    const handleLogout = () => {
        logout();
        navigate("/paciente/login");
    };

    const canPrev = offset > 0;
    const canNext = (solicitudes?.length || 0) >= pageSize;

    const fmtFecha = (iso) => {
        const s = (iso ?? "").toString();
        const ymd = s.slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "-";
        const [y, m, d] = ymd.split("-");
        return `${d}/${m}/${y}`;
    };

    const fmtHora = (iso) => {
        const s = (iso ?? "").toString();
        const hhmm = s.slice(11, 16);
        return /^\d{2}:\d{2}$/.test(hhmm) ? hhmm : "-";
    };

    const normalizeEstado = (v) =>
        (v ?? "").toString().trim().toUpperCase() || "PENDIENTE";

    const estadoBadge = (estado) => {
        const e = normalizeEstado(estado);
        if (e === "CONFIRMADA")
            return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
        if (e === "REALIZADA")
            return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
        if (e === "CANCELADA")
            return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
        if (e === "REPROGRAMADA")
            return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
        return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200";
    };

    const canCancelar = (row) => {
        const e = normalizeEstado(row?.estado);
        // Cancelable mientras no esté finalizada o ya cancelada
        return !!row?.id_cita && e !== "REALIZADA" && e !== "CANCELADA";
    };

    const cancelarCita = async (row) => {
        if (!row?.id_cita) return;
        if (!session?.user_id || !session?.id_sesion) return;

        const ok = window.confirm("¿Seguro que deseas cancelar esta solicitud/cita?");
        if (!ok) return;

        try {
            setCancelingId(row.id_cita);

            const payload = {
                p_actor_user_id: session.user_id,
                p_id_sesion: session.id_sesion,
                p_id_cita: row.id_cita,
                p_nuevo_estado: "CANCELADA",
                p_motivo: "Cancelada por el paciente",
            };

            const res = await createApiConn(
                TERAPIA_ENDPOINTS.CITAS_ESTADO_ACTUALIZAR,
                payload,
                "POST",
                session
            );

            // refrescar lista
            await fetchSolicitudes({
                p_limit: pageSize,
                p_offset: offset,
                p_id_usuario_paciente: session.user_id,
            });

            window.alert(res?.message || "Cita/solicitud cancelada.");
        } catch (err) {
            window.alert(err?.message || "No se pudo cancelar la cita/solicitud.");
        } finally {
            setCancelingId(null);
        }
    };

    const solicitudesOrdenadasFiltradas = useMemo(() => {
        const list = Array.isArray(solicitudes) ? [...solicitudes] : [];

        // Orden descendente por fecha/hora si existe
        list.sort((a, b) => {
            const ta = new Date(a?.inicio || a?.created_at || a?.fecha_programada || 0).getTime() || 0;
            const tb = new Date(b?.inicio || b?.created_at || b?.fecha_programada || 0).getTime() || 0;
            return tb - ta;
        });

        const f = normalizeEstado(estadoFilter);
        if (f !== "TODOS") {
            return list.filter((r) => normalizeEstado(r?.estado) === f);
        }
        return list;
    }, [solicitudes, estadoFilter]);

    const totalCitas = useMemo(
        () => (Array.isArray(solicitudesOrdenadasFiltradas) ? solicitudesOrdenadasFiltradas.length : 0),
        [solicitudesOrdenadasFiltradas]
    );

    const error = errorSolicitudes || errorBootstrap;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-950 dark:to-black font-display">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur bg-white/70 dark:bg-black/50 border-b border-black/5 dark:border-white/10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-2xl">
                                favorite
                            </span>
                            <span className="font-bold text-lg text-slate-800 dark:text-white">
                                Corazón de Migrante
                            </span>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm text-slate-600 dark:text-slate-300">
                                Hola, <strong>{session?.user_id ? `Paciente #${session.user_id}` : "Paciente"}</strong>
                            </span>

                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">logout</span>
                                Salir
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome */}
                <div className="rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 p-8 mb-8 border border-primary/10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-2">
                                ¡Bienvenido a tu espacio!
                            </h1>
                            <p className="text-slate-600 dark:text-slate-300 max-w-xl">
                                Aquí podrás ver tus citas y cancelar cuando lo necesites.
                            </p>
                        </div>

                        <Link
                            to="/paciente/booking"
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold shadow-lg hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <span className="material-symbols-outlined">calendar_add_on</span>
                            Agendar Cita
                        </Link>
                    </div>
                </div>

                {/* Próximas Citas */}
                <div className="rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-4">
                        <h2 className="font-bold text-lg text-slate-800 dark:text-white">
                            Próximas Citas
                        </h2>

                        <div className="flex items-center gap-2">
                            <select
                                value={estadoFilter}
                                onChange={(e) => {
                                    setOffset(0);
                                    setEstadoFilter(e.target.value);
                                }}
                                className="text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 text-slate-700 dark:text-slate-200 px-2 py-1.5"
                            >
                                <option value="TODOS">Todos</option>
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="CONFIRMADA">Confirmada</option>
                                <option value="REALIZADA">Realizada</option>
                                <option value="CANCELADA">Cancelada</option>
                                <option value="REPROGRAMADA">Reprogramada</option>
                            </select>

                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    setOffset(0);
                                    setPageSize(Number.isFinite(n) ? n : 10);
                                }}
                                className="text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 text-slate-700 dark:text-slate-200 px-2 py-1.5"
                            >
                                {[5, 10, 20, 50].map((n) => (
                                    <option key={n} value={n}>
                                        {n}/pág
                                    </option>
                                ))}
                            </select>

                            <button
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50"
                                onClick={() => setOffset((v) => Math.max(0, v - pageSize))}
                                disabled={!canPrev || loadingSolicitudes}
                                title="Anterior"
                            >
                                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                Ant.
                            </button>

                            <button
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50"
                                onClick={() => setOffset((v) => v + pageSize)}
                                disabled={!canNext || loadingSolicitudes}
                                title="Siguiente"
                            >
                                Sig.
                                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                            </button>
                        </div>
                    </div>

                    <div className="p-6">
                        {loadingSolicitudes || loadingBootstrap ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : totalCitas > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-slate-500 dark:text-slate-400">
                                            <th className="py-3 pr-4 font-semibold">Fecha</th>
                                            <th className="py-3 pr-4 font-semibold">Horario</th>
                                            <th className="py-3 pr-4 font-semibold">Estado</th>
                                            <th className="py-3 pr-4 font-semibold">Terapeuta</th>
                                            <th className="py-3 pr-4 font-semibold">Enfoque</th>
                                            <th className="py-3 pr-4 font-semibold">Producto</th>
                                            <th className="py-3 pr-2 font-semibold">Detalles</th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-black/5 dark:divide-white/10">
                                        {solicitudesOrdenadasFiltradas.map((r) => (
                                            <tr
                                                key={r.id_cita}
                                                className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <td className="py-3 pr-4 whitespace-nowrap text-slate-800 dark:text-white">
                                                    {fmtFecha(r.fecha_programada)}
                                                </td>

                                                <td className="py-3 pr-4 whitespace-nowrap text-slate-700 dark:text-slate-200">
                                                    {fmtHora(r.inicio)} - {fmtHora(r.fin)}
                                                </td>

                                                <td className="py-3 pr-4 whitespace-nowrap">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${estadoBadge(r.estado)}`}>
                                                        {normalizeEstado(r.estado)}
                                                    </span>
                                                </td>

                                                <td className="py-3 pr-4 whitespace-nowrap text-slate-700 dark:text-slate-200">
                                                    {r.terapeuta_nombre_completo || "—"}
                                                </td>

                                                <td className="py-3 pr-4 whitespace-nowrap text-slate-700 dark:text-slate-200">
                                                    {r.enfoque_nombre || "—"}
                                                </td>

                                                <td className="py-3 pr-4 whitespace-nowrap text-slate-700 dark:text-slate-200">
                                                    {r.producto_nombre || "—"}
                                                </td>

                                                {/* AQUÍ VA EL BOTÓN (lo demás no interesa) */}
                                                <td className="py-3 pr-2 whitespace-nowrap">
                                                    {canCancelar(r) ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => cancelarCita(r)}
                                                            disabled={cancelingId === r.id_cita}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                                         border border-red-200 bg-red-50 text-red-700 hover:bg-red-100
                                         dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30
                                         disabled:opacity-60 disabled:cursor-not-allowed"
                                                            title="Cancelar solicitud"
                                                        >
                                                            <span className="material-symbols-outlined text-[16px]">cancel</span>
                                                            {cancelingId === r.id_cita ? "Cancelando..." : "Cancelar"}
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-400">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-slate-400 text-3xl">
                                        event_busy
                                    </span>
                                </div>
                                <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    No hay citas para mostrar
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    Agenda una cita para comenzar.
                                </p>
                                <Link
                                    to="/paciente/booking"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Agendar Cita
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {error ? (
                    <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                        {error}
                    </div>
                ) : null}
            </main>

            <footer className="border-t border-black/5 dark:border-white/10 mt-12">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-xs text-slate-400 dark:text-slate-600">
                        © 2026 Corazón de Migrante. Todos los derechos reservados.
                    </p>
                </div>
            </footer>
        </div>
    );
}
