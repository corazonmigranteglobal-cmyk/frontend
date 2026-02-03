export function badgeByEstado(estadoUpper) {
    if (estadoUpper === "CONFIRMADO") return "bg-emerald-100 text-emerald-700";
    if (estadoUpper === "PENDIENTE") return "bg-amber-100 text-amber-700";
    if (estadoUpper === "CANCELADO") return "bg-slate-100 text-slate-500";
    return "bg-slate-100 text-slate-500";
}