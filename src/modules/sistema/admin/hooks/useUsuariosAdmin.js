import { useMemo, useState, useEffect } from "react";
import { USUARIOS_ENDPOINTS } from "../../../../config/USUARIOS_ENDPOINTS";
import { createApiConn } from "../../../../helpers/api_conn_factory";

export function useUsuariosAdmin(session) {
    const [users, setUsers] = useState([]);
    const [query, setQuery] = useState("");
    const [onlyActive, setOnlyActive] = useState(true);

    // Fetch users from backend
    useEffect(() => {
        if (!session) return;

        const fetchUsers = async () => {
            try {
                // Dynamic payload from session
                const payload = {
                    p_actor_user_id: session.user_id,  // Session uses user_id (from AdminLogin.jsx line 94)
                    p_id_sesion: session.id_sesion,    // Session uses id_sesion (from AdminLogin.jsx line 93)
                    p_limit: 10
                };

                // Debug payload to help verify if session properties are correct
                console.log("Fetching users with payload:", payload);

                const response = await createApiConn(USUARIOS_ENDPOINTS.USUARIOS_LISTAR, payload, "POST");

                if (response && response.rows && Array.isArray(response.rows)) {
                    // Map backend rows to frontend model
                    const mappedUsers = response.rows.map(u => ({
                        id: u.id_user,
                        initials: (u.email ? u.email.substring(0, 2).toUpperCase() : "??"), // Derive initials
                        name: u.email ? u.email.split('@')[0] : "Usuario", // Derive name from email
                        email: u.email,
                        role: u.tipo_usuario, // "USUARIO", "PACIENTE", etc.
                        status: u.estado // "Activo"
                    }));
                    setUsers(mappedUsers);
                } else {
                    console.warn("Respuesta inesperada al listar usuarios:", response);
                    setUsers([]);
                }
            } catch (err) {
                console.error("Error fetching users list:", err);
            }
        };
        fetchUsers();
    }, []);


    const filtered = useMemo(() => {
        let data = [...users];

        if (onlyActive) data = data.filter((u) => u.status === "Activo");

        const q = query.trim().toLowerCase();
        if (q) {
            data = data.filter((u) => {
                return (
                    String(u.id).includes(q) ||
                    u.name.toLowerCase().includes(q) ||
                    u.email.toLowerCase().includes(q) ||
                    u.role.toLowerCase().includes(q)
                );
            });
        }

        return data;
    }, [users, query, onlyActive]);

    return { users, setUsers, query, setQuery, onlyActive, setOnlyActive, filtered };
}
