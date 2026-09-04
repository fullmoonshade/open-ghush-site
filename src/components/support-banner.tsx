"use client";

import { useLanguage } from "@/lib/language";

export function SupportBanner({ onSupport }: { onSupport: () => void }) {
  const { t } = useLanguage();
  return (
    <section className="support-section" aria-labelledby="support-ghushsite-title">
      <div className="shell support-inner">
        <div>
          <span className="support-kicker">{t("CREATOR PAGES")}</span>
          <h2 id="support-ghushsite-title">{t("Like the work? Send a featured message.")}</h2>
        </div>
        <div className="support-copy">
          <button type="button" className="support-link" onClick={onSupport}>
            {t("VIEW CREATOR OPTIONS →")}
          </button>
        </div>
      </div>
    </section>
  );
}
