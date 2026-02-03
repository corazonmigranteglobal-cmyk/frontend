import React from "react";

export default function CTASection({ data, onAction }) {
  if (!data) return null;

  const id = data?.id || "";
  const title = data?.title || "";
  const body = data?.body || "";
  const bullets = Array.isArray(data?.bullets) ? data.bullets : [];

  const badge = data?.badge || {};
  const cardBody = data?.card_body || "";
  const primary = data?.primary_cta || {};
  const note = data?.note || {};

  return (
    <section id={id} className="py-20 px-6 lg:px-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="relative overflow-hidden rounded-[2rem] border border-primary/10 dark:border-white/10 bg-white/70 dark:bg-white/5 shadow-soft hover-lift">
          <div className="absolute inset-0 -z-10 opacity-90 gradient-shift
            bg-[radial-gradient(900px_circle_at_20%_20%,rgba(116,47,56,0.16),transparent_55%),radial-gradient(700px_circle_at_85%_40%,rgba(116,47,56,0.10),transparent_55%)]" />

          <div className="p-10 md:p-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-8 fade-in-up">
              <h3 className="font-display text-3xl md:text-4xl text-primary dark:text-white leading-tight">
                {title}
              </h3>
              <p className="mt-4 font-body text-lg text-text-muted-light dark:text-gray-300 leading-relaxed">
                {body}
              </p>

              {bullets.length ? (
                <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-text-muted-light dark:text-gray-300">
                  {bullets.map((b, idx) => (
                    <li key={(b?.text || "") + idx} className="flex items-start gap-2 stagger-item">
                      <span className="material-symbols-outlined text-primary dark:text-white text-[18px] mt-[1px]">
                        {b?.icon || ""}
                      </span>
                      {b?.text || ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="lg:col-span-4 fade-in-up delay-200">
              <div className="rounded-2xl bg-primary text-white p-8 shadow-soft pulse-soft hover-scale cursor-interactive transition-smooth">
                {(badge?.text || badge?.icon) ? (
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined">{badge?.icon || ""}</span>
                    <span className="font-body font-semibold">{badge?.text || ""}</span>
                  </div>
                ) : null}

                <p className="mt-3 text-sm opacity-90">
                  {cardBody}
                </p>

                {primary?.label ? (
                  <button
                    type="button"
                    onClick={() => onAction?.(primary?.action, primary?.href)}
                    className="mt-6 w-full px-5 py-3 rounded-xl bg-white text-primary font-body font-semibold hover:bg-white/90 transition-smooth button-press hover-glow"
                  >
                    {primary.label}
                  </button>
                ) : null}

                {(note?.text || note?.icon) ? (
                  <div className="mt-4 text-xs opacity-80 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">{note?.icon || ""}</span>
                    {note?.text || ""}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 h-px w-full bg-gradient-to-r from-transparent via-primary/15 to-transparent dark:via-white/10" />
      </div>
    </section>
  );
}
