"use client";

import { supportChannels, type SupportChannel } from "@/lib/support-channels";
import { useLanguage } from "@/lib/language";

function ChannelCard({ channel }: { channel: SupportChannel }) {
  const { t } = useLanguage();
  const live = channel.url.length > 0;
  return (
    <article className={live ? "support-card" : "support-card support-card-soon"}>
      <span className="micro-label">{t(channel.kind)}</span>
      <h2>{t(channel.name)}</h2>
      {live ? (
        <a className="support-card-cta" href={channel.url} target="_blank" rel="noopener noreferrer">
          {t(channel.cta)}
        </a>
      ) : (
        <span className="support-card-soon-tag">{t("LINK COMING SOON")}</span>
      )}
    </article>
  );
}

export function SupportPage({ onBack }: { onBack: () => void }) {
  const { t } = useLanguage();
  return (
    <main className="support-page shell-narrow">
      <button className="back-link" type="button" onClick={onBack}>{t("← BACK TO REPORTS")}</button>
      <p className="eyebrow">{t("CREATOR PAGES")}</p>
      <h1>{t("Choose a featured message")}<br /><em>{t("or buy us a coffee.")}</em></h1>

      <div className="support-grid">
        {supportChannels.map((channel) => <ChannelCard key={channel.id} channel={channel} />)}
      </div>

    </main>
  );
}
