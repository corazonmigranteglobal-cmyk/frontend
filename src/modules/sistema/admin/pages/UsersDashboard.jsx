import React, { useMemo } from "react";
import HeaderAdmin from "../../../terapia/admin/components/HeaderAdmin";
import UsersForm from "../components/UsersForm";
import UsersTable from "../components/UsersTable";
import PageHeader from "../components/PageHeader";
import { useUsuariosAdmin } from "../hooks/useUsuariosAdmin";
import { exportUsersCsv } from "../utils/exportUsersCsv";

export default function UsersDashboard({ session, onLogout, activeTab, onNavigate }) {
    const { query, setQuery, onlyActive, setOnlyActive, users, filtered } =
        useUsuariosAdmin(session);
    const totalActive = useMemo(
        () => (filtered ?? []).filter((u) => u.status === "Activo").length,
        [filtered]
    );

    return (
        <div className="min-h-screen bg-background-soft text-slate-800 antialiased">
            <HeaderAdmin
                session={session}
                onLogout={onLogout}
                activeTab={activeTab}
                onNavigate={onNavigate}
            />

            <PageHeader
                breadcrumb={[
                    { label: "Inicio" },
                    { label: "Usuarios", active: true },
                ]}
                title="Registro y Control de Usuarios"
                subtitle="Gestión centralizada de acceso, roles y permisos"
                action={
                    <button
                        type="button"
                        className="flex items-center gap-2 px-5 py-3 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:bg-black transition-all"
                        onClick={() => exportUsersCsv(filtered ?? [])}
                    >
                        <span className="material-symbols-outlined text-sm">download</span>
                        Exportar
                    </button>
                }
            />

            <main className="max-w-[1600px] mx-auto p-8">
                <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12 lg:col-span-6">
                        <UsersForm />
                    </div>

                    <div className="col-span-12 lg:col-span-6">
                        <UsersTable
                            query={query}
                            setQuery={setQuery}
                            onlyActive={onlyActive}
                            setOnlyActive={setOnlyActive}
                            users={filtered ?? []}
                            totalActive={totalActive}
                            session={session}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
