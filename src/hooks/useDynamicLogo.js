import { useEffect, useMemo, useState } from "react";

import { createApiConn } from "../helpers/api_conn_factory";
import { UI_ENDPOINTS } from "../config/UI_ENDPOINTS";
import { ROUTES_FILE_SERVER } from "../config/ROUTES_FILE_SERVER";

/**
 * Logo dinámico (público)
 *
 * Fuente: UI_ELEMENTO_OBTENER con id=1
 * - Soporta backends que respondan con `rows: [...]` o con un objeto directo.
 * - Soporta que el URL esté en `link` o `valor`.
 * - Fallback: ROUTES_FILE_SERVER.URL_LOGO (el PNG fijo anterior).
 */
export function useDynamicLogo({ idElemento = 1 } = {}) {
  const fallback = useMemo(
    () => ROUTES_FILE_SERVER?.URL_LOGO || "",
    []
  );

  const [logoUrl, setLogoUrl] = useState(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError("");

      const payload = {
        id_elemento: idElemento,
        p_id_elemento: idElemento,
      };

      // Algunos backends exponen este endpoint como POST, otros como GET.
      const tryMethods = [
        () => createApiConn(UI_ENDPOINTS.UI_ELEMENTO_OBTENER, payload, "POST"),
        () => createApiConn(UI_ENDPOINTS.UI_ELEMENTO_OBTENER, payload, "GET"),
      ];

      let res = null;
      let lastErr = null;

      for (const fn of tryMethods) {
        try {
          res = await fn();
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
        }
      }

      if (!alive) return;

      if (!res) {
        setLogoUrl(fallback);
        setError(lastErr?.message || "No se pudo cargar el logo dinámico.");
        setLoading(false);
        return;
      }

      const row =
        (Array.isArray(res?.rows) && res.rows[0]) ||
        res?.row ||
        res?.data ||
        res?.elemento ||
        res;

      const url =
        row?.link ||
        row?.valor ||
        row?.content_url ||
        row?.url ||
        (row?.metadata && (row.metadata.link || row.metadata.url)) ||
        null;

      setLogoUrl(url && String(url).trim() ? String(url).trim() : fallback);
      setLoading(false);
    }

    load();

    return () => {
      alive = false;
    };
  }, [idElemento, fallback]);

  return { logoUrl, loading, error };
}
