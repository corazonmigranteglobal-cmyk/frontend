// src/modules/vistas_publicas/public/components/landing/sections/ImpactPanelSection.jsx
import React, { useMemo } from "react";

function safeStr(v) {
  return v === undefined || v === null ? "" : String(v);
}

function asArray(v) {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  return [v];
}

/**
 * Contrato esperado (desde DB / JSON público):
 * content.presentation_section
 * {
 *   badge: { icon, text },
 *   title, subtitle,
 *   description: string[],
 *   primary_cta: { label, action, href },
 *   secondary_cta: { label, action, href },
 *   img: { id_ui, alt, fallback_src },
 *   img_footer_text
 * }
 */
export default function ImpactPanelSection({ data, onAction, resolveUiUrl }) {
  const d = data || null;
  if (!d) return null;

  const badgeText = safeStr(d?.badge?.text);
  const badgeIcon = safeStr(d?.badge?.icon) || "favorite";

  const title = safeStr(d?.title);
  const subtitle = safeStr(d?.subtitle);

  const bullets = useMemo(() => {
    return asArray(d?.description)
      .map((x) => safeStr(x).trim())
      .filter(Boolean)
      .slice(0, 6);
  }, [d]);

  const primary = d?.primary_cta || null;
  const secondary = d?.secondary_cta || null;

  const primaryLabel = safeStr(primary?.label || "Agendar una cita");
  const primaryAction = safeStr(primary?.action || "scroll_to_contacto");
  const primaryHref = safeStr(primary?.href || "#contacto");

  const secondaryLabel = safeStr(secondary?.label || "Conocer emociones");
  const secondaryAction = safeStr(secondary?.action || "scroll_to_emociones");
  const secondaryHref = safeStr(secondary?.href || "#emociones");

  const imgIdUi = d?.img?.id_ui;
  const imgAlt = safeStr(d?.img?.alt) || "Imagen de presentación";
  const imgFallback = safeStr(d?.img?.fallback_src);

  const imgSrc =
    (typeof resolveUiUrl === "function" ? safeStr(resolveUiUrl(imgIdUi)) : "") || imgFallback || "";

  const footerText = safeStr(d?.img_footer_text);

  return (
    <section id="impacto" className="relative overflow-hidden">
      {/* Fondo clean */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-background-light dark:bg-background-dark" />
        <div
          className="absolute inset-0 opacity-70 dark:opacity-50
          bg-[radial-gradient(900px_circle_at_15%_20%,rgba(116,47,56,0.12),transparent_60%),radial-gradient(700px_circle_at_85%_30%,rgba(209,167,58,0.10),transparent_55%)]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(247,246,246,1)_0%,rgba(247,246,246,0.7)_35%,rgba(247,246,246,1)_100%)] dark:bg-[linear-gradient(to_bottom,rgba(29,21,22,1)_0%,rgba(29,21,22,0.55)_40%,rgba(29,21,22,1)_100%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-12 md:pt-16 pb-10 md:pb-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center mt-14 w-full justify-items-center lg:justify-items-stretch">
          {/* Copy */}
          <div className="lg:col-span-5 w-full justify-self-start">
            {(badgeText || badgeIcon) ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/15 bg-white/60 dark:bg-white/5 dark:border-white/10 text-[12px] tracking-wide text-text-muted-light dark:text-gray-300">
                <span className="material-symbols-outlined text-[18px] text-primary dark:text-white">
                  {badgeIcon || "favorite"}
                </span>
                {badgeText}
              </div>
            ) : null}

            {title ? (
              <h2 className="mt-5 font-display text-3xl md:text-4xl leading-[1.08] text-primary dark:text-white">
                {title}
              </h2>
            ) : null}

            {subtitle ? (
              <p className="mt-4 font-body text-base md:text-lg text-text-muted-light dark:text-gray-300 leading-relaxed">
                {subtitle}
              </p>
            ) : null}

            {bullets.length ? (
              <ul className="mt-6 space-y-3">
                {bullets.map((b, idx) => (
                  <li key={idx} className="flex gap-3 items-start">
                    <span className="material-symbols-outlined text-primary dark:text-brand-gold mt-[2px]">
                      check_circle
                    </span>
                    <span className="font-body text-sm md:text-base text-text-main-light dark:text-gray-200">
                      {b}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => onAction?.(primaryAction, primaryHref)}
                className="px-6 py-3 rounded-lg bg-primary text-white hover:bg-primary-light transition-smooth shadow-soft font-body font-semibold button-press hover-glow"
              >
                {primaryLabel}
              </button>

              <button
                type="button"
                onClick={() => onAction?.(secondaryAction, secondaryHref)}
                className="px-6 py-3 rounded-lg bg-white/70 hover:bg-white transition-smooth border border-primary/15 text-primary dark:text-white dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 shadow-soft font-body font-semibold button-press"
              >
                {secondaryLabel}
              </button>
            </div>
          </div>

          {/* Visual */}
          <div className="lg:col-span-7 w-full justify-self-center">
            <div className="relative rounded-2xl overflow-hidden shadow-soft border border-primary/10 dark:border-white/10 bg-white/40 dark:bg-white/5">
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={imgAlt}
                  className="w-full h-[260px] sm:h-[340px] md:h-[420px] object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-[260px] sm:h-[340px] md:h-[420px] bg-black/5 dark:bg-white/10" />
              )}

              {footerText ? (
                <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 bg-[linear-gradient(to_top,rgba(0,0,0,0.55),transparent)]">
                  <div className="text-white/90 text-sm md:text-base font-body max-w-[54ch]">
                    {footerText}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
