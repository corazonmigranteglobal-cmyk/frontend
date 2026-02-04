import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSession } from "../../../../app/auth/SessionContext";
import { useBooking } from "../hooks/useBooking";

/**
 * Dashboard del paciente autenticado
 * - Muestra información básica del usuario
 * - Lista de citas próximas
 * - Acceso rápido a agendar nueva cita
 */
export default function PacienteDashboard() {
    const navigate = useNavigate();
    const { session, logout } = useSession();
    const { bootstrapData, loading, error, getBookingBootstrap } = useBooking();

    const [citas, setCitas] = useState([]);

    useEffect(() => {
        // Cargar datos iniciales al montar
        getBookingBootstrap(false).catch(console.error);
    }, []);

    const handleLogout = () => {
        logout();
        navigate("/paciente/login");
    };

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
                                <p className="text-sm text-slate-500 dark:text-slate-400">Próximas Citas</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-white">{citas.length}</p>
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
                            <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">arrow_forward</span>
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
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    Revisa y gestiona tus citas programadas.
                                </p>
                                <span className="inline-block mt-2 text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                                    Próximamente
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Citas Section */}
                <div className="rounded-2xl bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-black/5 dark:border-white/10">
                        <h2 className="font-bold text-lg text-slate-800 dark:text-white">Próximas Citas</h2>
                    </div>

                    <div className="p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                        ) : citas.length > 0 ? (
                            <div className="space-y-4">
                                {citas.map((cita, idx) => (
                                    <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <span className="material-symbols-outlined text-primary">event</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-800 dark:text-white">{cita.fecha}</p>
                                            <p className="text-sm text-slate-500">{cita.hora_inicio} - {cita.hora_fin}</p>
                                        </div>
                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                            {cita.estado || "PENDIENTE"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-slate-400 text-3xl">event_busy</span>
                                </div>
                                <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">No tienes citas programadas</h3>
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
                    <p className="text-center text-xs text-slate-400 dark:text-slate-600">
                        © 2026 Corazón de Migrante. Todos los derechos reservados.
                    </p>
                </div>
            </footer>
        </div>
    );
}
