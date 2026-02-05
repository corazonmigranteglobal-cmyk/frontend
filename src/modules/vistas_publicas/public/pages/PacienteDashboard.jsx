import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../../../../app/auth/SessionContext";
import { useBooking } from "../hooks/useBooking";
import { useSolicitudesCitaPaciente } from "../hooks/useSolicitudesCitaPaciente";

/**
 * Dashboard del paciente autenticado
 * - Muestra información básica del usuario
 * - Lista de solicitudes/citas (tabla)
 * - Acceso rápido a agendar nueva cita
 */
export default function PacienteDashboard() {
    const navigate = useNavigate();
    const { session, logout } = useSession();
    const { bootstrapData, loading: loadingBootstrap, error: errorBootstrap, getBookingBootstrap } = useBooking();

    // Tabla de solicitudes/citas
    const [pageSize, setPageSize] = useState(10);
    const [offset, setOffset] = useState(0);

    // Filtro de estado
    const [estadoFilter, setEstadoFilter] = useState("TODOS");

    const {
        rows: solicitudes,
        isLoading: loadingSolicitudes,
        error: errorSolicitudes,
        fetchSolicitudes,
    } = useSolicitudesCitaPaciente({ autoFetch: false, limit: pageSize, offset });

    useEffect(() => {
        // Cargar datos iniciales (booking bootstrap) al montar
        getBookingBootstrap(false).catch(console.error);
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

    const estadoBadge = (estado) => {
        const e = (estado || "").toString().toUpperCase();
        if (e === "CONFIRMADA") return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300";
        if (e === "REALIZADA") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300";
        if (e === "CANCELADA") return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
        if (e === "REPROGRAMADA") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
        return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200";
    };

    const normalizeEstado = (v) => (v ?? "").toString().trim().toUpperCase() || "PENDIENTE";

    const getSortTs = (r) => {
        const a = r?.created_at || r?.inicio || r?.fecha_programada || null;
        const t = a ? new Date(a).getTime() : 0;
        return Number.isFinite(t) ? t : 0;
    };

    const solicitudesOrdenadasFiltradas = useMemo(() => {
        const list = Array.isArray(solicitudes) ? [...solicitudes] : [];

        // Orden: más reciente -> más antiguo
        list.sort((a, b) => getSortTs(b) - getSortTs(a));

        // Filtro por estado (si aplica)
        const f = normalizeEstado(estadoFilter);
        if (f !== "TODOS") {
            return list.filter((r) => normalizeEstado(r?.estado) === f);
        }
        return list;
    }, [solicitudes, estadoFilter]);

    const totalProximas = useMemo(() => {
        // “Próximas” en el dashboard: solicitudes activas (no apagadas) y con fecha
        return (solicitudesOrdenadasFiltradas || []).filter((r) => (r?.register_status || "Activo") === "Activo").length;
    }, [solicitudesOrdenadasFiltradas]);

    const error = errorSolicitudes || errorBootstrap;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-950 dark:to-black font-display">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur bg-white/70 dark:bg-black/50 border-b border-black/5 dark:border-white/10">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary text-2xl">favorite</span>
                            <span className="font-bold text-lg text-slate-800 dark:text-white">Corazón de Migrante</span>
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

            {/* Main content */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Card */}
                <div className="rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 p-8 mb-8 border border-primary/10">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-2">
                                ¡Bienvenido a tu espacio seguro!
                            </h1>
                            <p className="text-slate-600 dark:text-slate-300 max-w-xl">
                                Aquí podrás gestionar tus citas, explorar nuestros servicios y dar seguimiento a tu proceso terapéutico.
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

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">event</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Historial de citas</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-white">{totalProximas}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Estado</p>
                                <p className="text-xl font-bold text-green-600 dark:text-green-400">Activo</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-purple-600 dark:text-purple-400">psychology</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Enfoques</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-white">{bootstrapData?.enfoques?.length || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 p-5 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-orange-600 dark:text-orange-400">groups</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Terapeutas</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-white">{bootstrapData?.terapeutas?.length || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Agendar Cita */}
                    <Link
                        to="/paciente/booking"
                        className="group rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
                    >
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <span className="material-symbols-outlined text-primary text-2xl">add_circle</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">Agendar Nueva Cita</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Elige un terapeuta, fecha y horario disponible para tu próxima sesión.
                                </p>
                            </div>
                            <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">
                                arrow_forward
                            </span>
                        </div>
                    </Link>

                    {/* Ver Citas */}
                    <div className="rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 p-6 shadow-sm opacity-60">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-500 text-2xl">calendar_month</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">Mis Citas</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Revisa y gestiona tus citas programadas.</p>
                                <span className="inline-block mt-2 text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                                    Próximamente
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Citas Section */}
                <div className="rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-black/5 dark:border-white/10 flex items-center justify-between gap-4">
                        <h2 className="font-bold text-lg text-slate-800 dark:text-white">Próximas Citas</h2>

                        <div className="flex items-center gap-2">
                            {/* Filtro estado */}
                            <select
                                value={estadoFilter}
                                onChange={(e) => {
                                    setOffset(0);
                                    setEstadoFilter(e.target.value);
                                }}
                                className="text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 text-slate-700 dark:text-slate-200 px-2 py-1.5"
                                aria-label="Filtro por estado"
                            >
                                <option value="TODOS">Todos</option>
                                <option value="PENDIENTE">Pendiente</option>
                                <option value="CONFIRMADA">Confirmada</option>
                                <option value="REALIZADA">Realizada</option>
                                <option value="CANCELADA">Cancelada</option>
                                <option value="REPROGRAMADA">Reprogramada</option>
                            </select>

                            {/* Page size */}
                            <select
                                value={pageSize}
                                onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    setOffset(0);
                                    setPageSize(Number.isFinite(n) ? n : 10);
                                }}
                                className="text-sm rounded-lg border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 text-slate-700 dark:text-slate-200 px-2 py-1.5"
                                aria-label="Tamaño de página"
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
                        ) : (solicitudesOrdenadasFiltradas?.length || 0) > 0 ? (
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
                                            <tr key={r.id_cita} className="hover:bg-slate-50/70 dark:hover:bg-white/5 transition-colors">
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
                                                    {r.terapeuta_nombre_completo || "-"}
                                                </td>
                                                <td className="py-3 pr-4 whitespace-nowrap text-slate-700 dark:text-slate-200">
                                                    {r.enfoque_nombre || "-"}
                                                </td>
                                                <td className="py-3 pr-4 whitespace-nowrap text-slate-700 dark:text-slate-200">
                                                    {r.producto_nombre || "-"}
                                                </td>
                                                <td className="py-3 pr-2 text-slate-600 dark:text-slate-300">
                                                    <div className="flex flex-col gap-1">
                                                        {r.canal ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[18px] text-slate-400">
                                                                    wifi_calling_3
                                                                </span>
                                                                <span className="truncate max-w-[22rem]">{r.canal}</span>
                                                            </div>
                                                        ) : null}

                                                        {r.enlace_sesion ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[18px] text-slate-400">link</span>
                                                                <a
                                                                    href={r.enlace_sesion}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="text-primary hover:underline truncate max-w-[22rem]"
                                                                >
                                                                    Enlace de sesión
                                                                </a>
                                                            </div>
                                                        ) : null}

                                                        {r.direccion ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-[18px] text-slate-400">location_on</span>
                                                                <span className="truncate max-w-[22rem]">{r.direccion}</span>
                                                            </div>
                                                        ) : null}

                                                        {!r.canal && !r.enlace_sesion && !r.direccion ? (
                                                            <span className="text-slate-400">—</span>
                                                        ) : null}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-slate-400 text-3xl">event_busy</span>
                                </div>
                                <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    {normalizeEstado(estadoFilter) === "TODOS"
                                        ? "No tienes citas programadas"
                                        : `No hay citas en estado ${normalizeEstado(estadoFilter)}`}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                    Agenda tu primera cita para comenzar tu proceso terapéutico.
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

                {/* Error display */}
                {error && (
                    <div className="mt-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                        {error}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="border-t border-black/5 dark:border-white/10 mt-12">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <p className="text-center text-xs text-slate-400 dark:text-slate-600">© 2026 Corazón de Migrante. Todos los derechos reservados.</p>
                </div>
            </footer>
        </div>
    );
}
