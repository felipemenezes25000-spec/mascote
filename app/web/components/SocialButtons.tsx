import type { Dictionary } from "@/lib/i18n";
import { SITE } from "@/lib/site";

const icons: Record<string, JSX.Element> = {
  instagram: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" />
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M14 3v10.5a3 3 0 1 1-3-3v3a0 0 0 0 0 0 0V3h3z" />
      <path d="M14 3c0 2 1.5 4 4 4v3c-1.5 0-3-.5-4-1.5V3z" />
    </svg>
  ),
  twitter: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M18 3h2.5l-5.5 6.3L21.5 21H16l-4.5-6L6 21H3.5l6-6.9L3 3h5.7l4 5.5L18 3zm-1 16h1.4L7.2 5H5.7l11.3 14z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
      <path d="M22 12s0-3.5-.4-5.2c-.2-.9-1-1.7-1.9-1.9C17.9 4.5 12 4.5 12 4.5s-5.9 0-7.7.4c-.9.2-1.7 1-1.9 1.9C2 8.5 2 12 2 12s0 3.5.4 5.2c.2.9 1 1.7 1.9 1.9 1.8.4 7.7.4 7.7.4s5.9 0 7.7-.4c.9-.2 1.7-1 1.9-1.9.4-1.7.4-5.2.4-5.2zm-12 3.3V8.7l5.7 3.3-5.7 3.3z" />
    </svg>
  ),
};

export function SocialButtons({ dict, tone = "light" }: { dict: Dictionary; tone?: "light" | "dark" }) {
  return (
    <ul aria-label={dict.social.label} className="flex items-center gap-2">
      {dict.social.items.map((s) => {
        const url = SITE.social[s.key as keyof typeof SITE.social];
        if (!url) return null;
        return (
          <li key={s.key}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={s.name}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border transition ${
                tone === "dark"
                  ? "border-cream/20 text-cream hover:bg-cream hover:text-ink"
                  : "border-ink/15 text-ink hover:bg-ink hover:text-cream"
              }`}
            >
              {icons[s.key] || s.name}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
