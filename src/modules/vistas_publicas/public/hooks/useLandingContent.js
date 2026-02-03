import { useEffect, useMemo, useState } from "react";

const LANDING_JSON_URL =
    "https://storage.googleapis.com/vistas_publicas_assets/landing_page/text_content/landing_page.json";

let _cache = null;

export function useLandingContent() {
    const [content, setContent] = useState(_cache);
    const [loading, setLoading] = useState(!_cache);
    const [error, setError] = useState(null);

    useEffect(() => {
        let alive = true;

        async function run() {
            if (_cache) return;

            try {
                setLoading(true);
                setError(null);

                const res = await fetch(LANDING_JSON_URL, {
                    method: "GET",
                    headers: { Accept: "application/json" },
                    cache: "no-store",
                });

                if (!res.ok) {
                    throw new Error(`HTTP_${res.status}`);
                }

                const data = await res.json();
                console.log("Data: ", data);

                // cache en memoria
                _cache = data;

                if (alive) setContent(data);
            } catch (e) {
                if (alive) setError(e);
            } finally {
                if (alive) setLoading(false);
            }
        }

        run();
        return () => {
            alive = false;
        };
    }, []);

    return useMemo(() => ({ content, loading, error }), [content, loading, error]);
}
