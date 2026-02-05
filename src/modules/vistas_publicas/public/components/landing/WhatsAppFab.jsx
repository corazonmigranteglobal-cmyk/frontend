// src/modules/vistas_publicas/public/components/landing/WhatsAppFab.jsx
import React, { useCallback, useMemo } from "react";

function normalizePhoneForWhatsApp(raw) {
  let d = String(raw || "").replace(/[^\d]/g, ""); // solo dígitos

  // normaliza prefijo internacional "00"
  if (d.startsWith("00")) d = d.slice(2);

  // normaliza casos tipo 5910XXXXXXXX (0 extra después del país)
  if (d.startsWith("5910")) d = "591" + d.slice(4);

  return d;
}

export default function WhatsAppFab({
  phone,
  message = "Quiero agendar una cita",
  labels,
}) {
  const waPhone = useMemo(() => normalizePhoneForWhatsApp(phone), [phone]);

  const text = useMemo(
    () => encodeURIComponent(String(message || "")),
    [message]
  );

  // 1) Deep link directo a la app (más confiable en iOS)
  const appHref = useMemo(() => {
    if (!waPhone) return "";
    return `whatsapp://send?phone=${waPhone}&text=${text}`;
  }, [waPhone, text]);

  // 2) Fallback web (si no abre la app)
  const webHref = useMemo(() => {
    if (!waPhone) return "";
    return `https://wa.me/${waPhone}?text=${text}`;
  }, [waPhone, text]);

  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      if (!waPhone) return;

      // Intento 1: abrir app
      window.location.href = appHref;

      // Fallback: si no abre (WhatsApp no instalado o bloqueado), abre web
      setTimeout(() => {
        window.location.href = webHref;
      }, 700);
    },
    [waPhone, appHref, webHref]
  );

  if (!waPhone) return null;

  const ariaLabel = labels?.aria_label || "WhatsApp";
  const title = labels?.title || "WhatsApp";

  return (
    <a
      href={webHref}
      onClick={onClick}
      className="fixed bottom-6 right-20 p-3 rounded-full bg-primary text-white shadow-soft hover:bg-primary-light transition-colors focus:outline-none z-50 dark:bg-white dark:text-primary"
      aria-label={ariaLabel}
      title={title}
    >
      <svg viewBox="0 0 32 32" className="w-6 h-6" fill="currentColor" aria-hidden="true">
        <path d="M19.11 17.26c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.23-.65.08-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.48-1.74-1.66-2.04-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.68-1.64-.93-2.25-.24-.58-.48-.5-.68-.5h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.07-.13-.27-.2-.57-.35z" />
        <path d="M16.01 2.67c-7.37 0-13.33 5.96-13.33 13.33 0 2.36.62 4.57 1.7 6.49L3.2 29.33l6.99-1.83c1.86 1.02 4 1.6 6.32 1.6 7.37 0 13.33-5.96 13.33-13.33S23.38 2.67 16.01 2.67zm0 24.18c-2.07 0-3.99-.61-5.6-1.66l-.4-.25-4.15 1.09 1.11-4.04-.26-.41a11.12 11.12 0 01-1.77-5.96c0-6.16 5-11.16 11.16-11.16 6.16 0 11.16 5 11.16 11.16 0 6.16-5 11.23-11.25 11.23z" />
      </svg>
    </a>
  );
}
