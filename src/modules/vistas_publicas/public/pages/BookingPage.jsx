import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useBooking } from "../hooks/useBooking";

/**
 * Página de reserva de citas terapéuticas
 * Flujo paso a paso:
 * 1. Selección de producto
 * 2. Selección de enfoque
 * 3. Selección de terapeuta
 * 4. Selección de fecha/hora
 * 5. Confirmación
 */
export default function BookingPage({ overridePacienteId = null, returnTo = null } = {}) {
    const navigate = useNavigate();

    const {
        loading,
        error,
        bootstrapData,
        disponibilidad,
        getBookingBootstrap,
        getDisponibilidad,
        registrarCita,
    } = useBooking({ overridePacienteId });

    // ✅ Autodetecta returnTo cuando estás en admin y no te lo pasaron
    const effectiveReturnTo = useMemo(() => {
        if (returnTo) return returnTo;

        const p = typeof window !== "undefined" ? String(window.location?.pathname || "") : "";
        const isAdminPath = p.startsWith("/admin") || p.startsWith("/portal-admin");

        // Si estás creando cita para otro paciente, esto es modo admin
        if (overridePacienteId != null && isAdminPath) {
            const bp = p.startsWith("/portal-admin") ? "/portal-admin" : "/admin";
            return `${bp}/solicitudes`;
        }

        return "/paciente/dashboard";
    }, [returnTo, overridePacienteId]);

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        enfoque: null,
        producto: null,
        terapeuta: null,
        fecha: "",
        horaInicio: "",
        horaFin: "",
        notas: "",
    });

    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [success, setSuccess] = useState(false);

    // Load bootstrap data on mount
    useEffect(() => {
        getBookingBootstrap(true).catch(console.error);
    }, [getBookingBootstrap]);

    // Carga disponibilidad SOLO si el bootstrap no trajo horarios por terapeuta (evita llamada innecesaria)
    useEffect(() => {
        const tid = formData.terapeuta?.id_usuario;
        if (!tid) return;
        if (step !== 4) return;

        const map = bootstrapData?.horarios_disponibles_por_terapeuta;
        const hasFromBootstrap = map && Object.prototype.hasOwnProperty.call(map, String(tid));

        if (!hasFromBootstrap) {
            getDisponibilidad(tid).catch(console.error);
        }
    }, [formData.terapeuta, step, getDisponibilidad, bootstrapData]);

    const updateForm = useCallback(
        (field, value) => {
            setFormData((prev) => {
                // resets encadenados cuando cambia algo "arriba" en el flujo
                if (field === "producto") {
                    return {
                        ...prev,
                        producto: value,
                        // enfoque se setea afuera (onClick) para poder resolver default
                        terapeuta: null,
                        fecha: "",
                        horaInicio: "",
                        horaFin: "",
                    };
                }
                if (field === "enfoque") {
                    return {
                        ...prev,
                        enfoque: value,
                        terapeuta: null,
                        fecha: "",
                        horaInicio: "",
                        horaFin: "",
                    };
                }
                if (field === "terapeuta") {
                    return {
                        ...prev,
                        terapeuta: value,
                        fecha: "",
                        horaInicio: "",
                        horaFin: "",
                    };
                }
                return { ...prev, [field]: value };
            });
        },
        []
    );

    const nextStep = () => setStep((s) => Math.min(s + 1, 5));
    const prevStep = () => setStep((s) => Math.max(s - 1, 1));

    const handleSubmit = async () => {
        if (!formData.terapeuta || !formData.producto || !formData.enfoque || !formData.fecha || !formData.horaInicio) {
            setSubmitError("Por favor completa todos los campos requeridos.");
            return;
        }

        setSubmitLoading(true);
        setSubmitError(null);
        try {
            await registrarCita({
                idTerapeuta: formData.terapeuta.id_usuario,
                idProducto: formData.producto.id_producto,
                idEnfoque: formData.enfoque.id_enfoque,
                fecha: formData.fecha,
                horaInicio: formData.horaInicio,
                horaFin: formData.horaFin,
                notas: formData.notas,
            });
            setSuccess(true);
        } catch (err) {
            setSubmitError(err?.message || "Error al registrar la cita.");
        } finally {
            setSubmitLoading(false);
        }
    };

    const slotsFromBootstrap = useMemo(() => {
        const tid = formData.terapeuta?.id_usuario;
        const map = bootstrapData?.horarios_disponibles_por_terapeuta;
        if (!tid || !map) return [];
        const raw = map[String(tid)];
        if (!Array.isArray(raw)) return [];

        // Normaliza a la misma forma que getDisponibilidad
        return raw
            .map((h) => {
                const fecha = h?.fecha ? String(h.fecha).split("T")[0] : (h?.inicio ? String(h.inicio).split("T")[0] : null);
                const inicio = h?.inicio || null;
                const fin = h?.fin || null;
                const hora_inicio = inicio
                    ? new Date(inicio).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                    })
                    : null;
                const hora_fin = fin
                    ? new Date(fin).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                    })
                    : null;
                return { ...h, fecha, hora_inicio, hora_fin, disponible: true };
            })
            .filter((x) => x.fecha && x.hora_inicio && x.hora_fin);
    }, [bootstrapData, formData.terapeuta]);

    // Group horarios by date (preferimos bootstrap para evitar llamada)
    const groupedHorarios = useMemo(() => {
        const arr = (slotsFromBootstrap?.length ? slotsFromBootstrap : (Array.isArray(disponibilidad) ? disponibilidad : [])) || [];
        return arr.reduce((acc, h) => {
            if (!h?.fecha) return acc;
            if (!acc[h.fecha]) acc[h.fecha] = [];
            acc[h.fecha].push(h);
            return acc;
        }, {});
    }, [disponibilidad, slotsFromBootstrap]);

    // Success screen
    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-950 dark:to-black flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center">
                    <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-4xl">
                            check_circle
                        </span>
                    </div>

                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">¡Cita Agendada!</h1>
                    <p className="text-slate-600 dark:text-slate-300 mb-2">
                        Tu cita ha sido registrada exitosamente.
                    </p>

                    <div className="bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-2xl p-4 mb-6">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                                {formData.enfoque?.image_url ? (
                                    <img
                                        src={formData.enfoque.image_url}
                                        alt={formData.enfoque?.nombre || "Enfoque"}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <span className="material-symbols-outlined text-primary">psychology</span>
                                )}
                            </div>
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                                {formData.terapeuta?.image_url || formData.terapeuta?.foto_perfil_link ? (
                                    <img
                                        src={formData.terapeuta?.image_url || formData.terapeuta?.foto_perfil_link}
                                        alt={formData.terapeuta?.nombre || "Terapeuta"}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                ) : (
                                    <span className="material-symbols-outlined text-primary">person</span>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Fecha: <strong className="text-slate-800 dark:text-white">{formData.fecha}</strong>
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Hora:{" "}
                            <strong className="text-slate-800 dark:text-white">
                                {formData.horaInicio} - {formData.horaFin}
                            </strong>
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Terapeuta:{" "}
                            <strong className="text-slate-800 dark:text-white">
                                {formData.terapeuta?.nombre || "Asignado"}
                            </strong>
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Enfoque:{" "}
                            <strong className="text-slate-800 dark:text-white">
                                {formData.enfoque?.nombre || "Asignado"}
                            </strong>
                        </p>
                    </div>

                    {/* ✅ Navegación segura */}
                    <button
                        type="button"
                        onClick={() => navigate(effectiveReturnTo, { replace: true })}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
                    >
                        <span className="material-symbols-outlined">home</span>
                        Ir al Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-950 dark:to-black font-display">
            {/* Header */}
            <header className="sticky top-0 z-50 backdrop-blur bg-white/70 dark:bg-black/50 border-b border-black/5 dark:border-white/10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link
                            to={effectiveReturnTo}
                            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                            <span className="font-medium">Volver</span>
                        </Link>

                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">favorite</span>
                            <span className="font-bold text-slate-800 dark:text-white">Agendar Cita</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Progress Steps */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="flex items-center justify-between mb-8">
                    {[1, 2, 3, 4, 5].map((s) => (
                        <div key={s} className="flex items-center flex-1">
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${step >= s
                                        ? "bg-primary text-white"
                                        : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                                    }`}
                            >
                                {step > s ? (
                                    <span className="material-symbols-outlined text-[16px]">check</span>
                                ) : (
                                    s
                                )}
                            </div>

                            {s < 5 && (
                                <div
                                    className={`flex-1 h-1 mx-2 rounded-full transition-colors ${step > s ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Titles */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                        {step === 1 && "Elige tu Servicio"}
                        {step === 2 && "Elige el Enfoque"}
                        {step === 3 && "Selecciona un Terapeuta"}
                        {step === 4 && "Elige Fecha y Hora"}
                        {step === 5 && "Confirma tu Cita"}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        {step === 1 && "Selecciona el servicio que deseas reservar."}
                        {step === 2 && "Elige el enfoque terapéutico para tu sesión."}
                        {step === 3 && "Conoce a nuestros profesionales y elige el que mejor se adapte a ti."}
                        {step === 4 && "Selecciona el horario que mejor te convenga."}
                        {step === 5 && "Revisa los detalles antes de confirmar."}
                    </p>
                </div>

                {/* Loading state */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                        {error}
                    </div>
                )}

                {/* Step 1: Select Producto */}
                {step === 1 && !loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(bootstrapData?.productos || []).map((prod) => (
                            <button
                                key={prod.id_producto}
                                onClick={() => {
                                    updateForm("producto", prod);
                                    // set default enfoque del producto (si existe)
                                    const idDef = prod?.id_enfoque_default;
                                    const enf = (bootstrapData?.enfoques || []).find((e) => e?.id_enfoque === idDef) || null;
                                    updateForm("enfoque", enf);
                                }}
                                className={`text-left p-5 rounded-2xl border transition-all ${formData.producto?.id_producto === prod.id_producto
                                        ? "border-primary bg-primary/5 shadow-md"
                                        : "border-black/5 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary/50"
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.producto?.id_producto === prod.id_producto
                                                ? "bg-primary/20"
                                                : "bg-slate-100 dark:bg-slate-800"
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-primary">spa</span>
                                    </div>

                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-1">{prod.nombre}</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                            {prod.descripcion || "Sesión de terapia individual"}
                                        </p>
                                        {prod.precio && <p className="mt-2 text-sm font-semibold text-primary">${prod.precio}</p>}
                                    </div>

                                    {formData.producto?.id_producto === prod.id_producto && (
                                        <span className="material-symbols-outlined text-primary">check_circle</span>
                                    )}
                                </div>
                            </button>
                        ))}

                        {(!bootstrapData?.productos || bootstrapData.productos.length === 0) && (
                            <div className="col-span-2 text-center py-12 text-slate-500">
                                No hay servicios disponibles en este momento.
                            </div>
                        )}
                    </div>
                )}

                {/* Step 2: Select Enfoque */}
                {step === 2 && !loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(bootstrapData?.enfoques || []).map((enf) => {
                            const img = enf?.image_url || enf?.foto_link || null;
                            return (
                                <button
                                    key={enf.id_enfoque}
                                    onClick={() => updateForm("enfoque", enf)}
                                    className={`text-left p-5 rounded-2xl border transition-all ${formData.enfoque?.id_enfoque === enf.id_enfoque
                                            ? "border-primary bg-primary/5 shadow-md"
                                            : "border-black/5 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary/50"
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                                            {img ? (
                                                <img
                                                    src={img}
                                                    alt={enf.nombre}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <span className="material-symbols-outlined text-primary text-2xl">psychology</span>
                                            )}
                                        </div>

                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800 dark:text-white mb-1">{enf.nombre}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                                                {enf.descripcion || "Enfoque terapéutico"}
                                            </p>
                                        </div>

                                        {formData.enfoque?.id_enfoque === enf.id_enfoque && (
                                            <span className="material-symbols-outlined text-primary">check_circle</span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}

                        {(!bootstrapData?.enfoques || bootstrapData.enfoques.length === 0) && (
                            <div className="col-span-2 text-center py-12 text-slate-500">
                                No hay enfoques disponibles en este momento.
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Select Terapeuta */}
                {step === 3 && !loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(bootstrapData?.terapeutas || []).map((ter) => (
                            <button
                                key={ter.id_usuario}
                                onClick={() => updateForm("terapeuta", ter)}
                                className={`text-left p-5 rounded-2xl border transition-all ${formData.terapeuta?.id_usuario === ter.id_usuario
                                        ? "border-primary bg-primary/5 shadow-md"
                                        : "border-black/5 dark:border-white/10 bg-white dark:bg-white/5 hover:border-primary/50"
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                                        {ter?.image_url || ter?.foto_perfil_link ? (
                                            <img
                                                src={ter?.image_url || ter?.foto_perfil_link}
                                                alt={ter?.nombre || "Terapeuta"}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <span className="material-symbols-outlined text-primary text-2xl">person</span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-1">
                                            {ter.nombre || `Terapeuta #${ter.id_usuario}`}
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            {ter.especialidad || "Psicología clínica"}
                                        </p>
                                        {ter.enfoque && (
                                            <span className="inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                                {ter.enfoque}
                                            </span>
                                        )}
                                    </div>
                                    {formData.terapeuta?.id_usuario === ter.id_usuario && (
                                        <span className="material-symbols-outlined text-primary">check_circle</span>
                                    )}
                                </div>
                            </button>
                        ))}

                        {(!bootstrapData?.terapeutas || bootstrapData.terapeutas.length === 0) && (
                            <div className="col-span-2 text-center py-12 text-slate-500">
                                No hay terapeutas disponibles en este momento.
                            </div>
                        )}
                    </div>
                )}

                {/* Step 4: Select Date/Time */}
                {step === 4 && !loading && (
                    <div className="space-y-6">
                        {Object.keys(groupedHorarios).length > 0 ? (
                            Object.entries(groupedHorarios).map(([fecha, horarios]) => (
                                <div
                                    key={fecha}
                                    className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden"
                                >
                                    <div className="px-5 py-3 bg-slate-50 dark:bg-white/5 border-b border-black/5 dark:border-white/10">
                                        <h3 className="font-semibold text-slate-800 dark:text-white">
                                            {new Date(fecha + "T12:00:00").toLocaleDateString("es-ES", {
                                                weekday: "long",
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                        </h3>
                                    </div>
                                    <div className="p-4 flex flex-wrap gap-2">
                                        {horarios.map((h, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    updateForm("fecha", h.fecha);
                                                    updateForm("horaInicio", h.hora_inicio);
                                                    updateForm("horaFin", h.hora_fin);
                                                }}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${formData.fecha === h.fecha && formData.horaInicio === h.hora_inicio
                                                        ? "bg-primary text-white shadow-md"
                                                        : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-primary/10"
                                                    }`}
                                            >
                                                {h.hora_inicio} - {h.hora_fin}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                                    <span className="material-symbols-outlined text-slate-400 text-3xl">event_busy</span>
                                </div>
                                <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">No hay horarios disponibles</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    El terapeuta seleccionado no tiene horarios disponibles en las próximas 2 semanas.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 5: Confirmation */}
                {step === 5 && (
                    <div className="max-w-lg mx-auto">
                        <div className="rounded-2xl border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                                        {formData.enfoque?.image_url ? (
                                            <img
                                                src={formData.enfoque.image_url}
                                                alt={formData.enfoque?.nombre || "Enfoque"}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <span className="material-symbols-outlined text-primary">psychology</span>
                                        )}
                                    </div>
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center">
                                        {formData.terapeuta?.image_url || formData.terapeuta?.foto_perfil_link ? (
                                            <img
                                                src={formData.terapeuta?.image_url || formData.terapeuta?.foto_perfil_link}
                                                alt={formData.terapeuta?.nombre || "Terapeuta"}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <span className="material-symbols-outlined text-primary">person</span>
                                        )}
                                    </div>
                                    <div className="text-sm text-slate-600 dark:text-slate-300">
                                        <div className="font-semibold text-slate-800 dark:text-white line-clamp-1">
                                            {formData.terapeuta?.nombre || "Terapeuta"}
                                        </div>
                                        <div className="text-slate-500 dark:text-slate-400 line-clamp-1">
                                            {formData.enfoque?.nombre || "Enfoque"}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary">spa</span>
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Servicio</p>
                                        <p className="font-semibold text-slate-800 dark:text-white">
                                            {formData.producto?.nombre || "No seleccionado"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary">psychology</span>
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Enfoque</p>
                                        <p className="font-semibold text-slate-800 dark:text-white">
                                            {formData.enfoque?.nombre || "No seleccionado"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary">person</span>
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Terapeuta</p>
                                        <p className="font-semibold text-slate-800 dark:text-white">
                                            {formData.terapeuta?.nombre || "No seleccionado"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary">event</span>
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Fecha y Hora</p>
                                        <p className="font-semibold text-slate-800 dark:text-white">
                                            {formData.fecha
                                                ? new Date(formData.fecha + "T12:00:00").toLocaleDateString("es-ES", {
                                                    weekday: "long",
                                                    year: "numeric",
                                                    month: "long",
                                                    day: "numeric",
                                                })
                                                : "No seleccionado"}
                                        </p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            {formData.horaInicio} - {formData.horaFin}
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Notas adicionales (opcional)
                                    </label>
                                    <textarea
                                        value={formData.notas}
                                        onChange={(e) => updateForm("notas", e.target.value)}
                                        placeholder="¿Hay algo que te gustaría compartir antes de la sesión?"
                                        className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-white placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            {submitError && (
                                <div className="mx-6 mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                                    {submitError}
                                </div>
                            )}

                            <div className="px-6 py-4 bg-slate-50 dark:bg-white/5 border-t border-black/5 dark:border-white/10">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitLoading}
                                    className="w-full py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                >
                                    {submitLoading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-symbols-outlined">check</span>
                                            Confirmar Cita
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                {!loading && (
                    <div className="flex items-center justify-between mt-8">
                        <button
                            onClick={prevStep}
                            disabled={step === 1}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${step === 1
                                    ? "opacity-50 cursor-not-allowed text-slate-400"
                                    : "text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/10"
                                }`}
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                            Anterior
                        </button>

                        {step < 5 && (
                            <button
                                onClick={nextStep}
                                disabled={
                                    (step === 1 && !formData.producto) ||
                                    (step === 2 && !formData.enfoque) ||
                                    (step === 3 && !formData.terapeuta) ||
                                    (step === 4 && !formData.fecha)
                                }
                                className="inline-flex items-center gap-2 px-6 py-2 rounded-lg bg-primary text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                            >
                                Siguiente
                                <span className="material-symbols-outlined">arrow_forward</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
