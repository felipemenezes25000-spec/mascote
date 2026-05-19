import { ImageResponse } from "next/og";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";

export const runtime = "edge";
export const alt = "Mascote — bem-estar com alma brasileira";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG({ params }: { params: { lang: string } }) {
  const lang = (isLocale(params.lang) ? params.lang : "pt") as Locale;
  const dict = getDictionary(lang);
  const headline =
    lang === "pt"
      ? "Cuide de você. Ele evolui junto."
      : lang === "es"
        ? "Cuídate. Él crece contigo."
        : "Take care of you. They grow with you.";
  const sub =
    lang === "pt"
      ? "Sem ranking · Sem culpa · Só presença"
      : lang === "es"
        ? "Sin ranking · Sin culpa · Solo presencia"
        : "No leaderboard · No guilt · Just presence";
  const tags =
    lang === "pt"
      ? ["4 personalidades", "Anti-grind", "Local-first"]
      : lang === "es"
        ? ["4 personalidades", "Anti-presión", "Local-first"]
        : ["4 personalities", "Anti-grind", "Local-first"];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FBF6F1",
          padding: "60px 70px",
          position: "relative",
          fontFamily: "serif",
        }}
      >
        {/* gradients */}
        <div
          style={{
            position: "absolute",
            top: -180,
            left: -120,
            width: 520,
            height: 520,
            borderRadius: 520,
            background: "radial-gradient(circle, #FF8030 0%, rgba(255,128,48,0) 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -200,
            right: -120,
            width: 560,
            height: 560,
            borderRadius: 560,
            background: "radial-gradient(circle, #F2C14E 0%, rgba(242,193,78,0) 65%)",
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#FF8030",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 64 64">
              <ellipse cx="32" cy="36" rx="20" ry="22" fill="#FBF6F1" />
              <circle cx="24" cy="30" r="2.4" fill="#1F1A14" />
              <circle cx="40" cy="30" r="2.4" fill="#1F1A14" />
              <path d="M 27 42 Q 32 46 37 42" stroke="#1F1A14" strokeWidth="2.4" fill="none" />
              <line x1="32" y1="14" x2="32" y2="10" stroke="#1F1A14" strokeWidth="2.6" />
              <circle cx="32" cy="8" r="2.6" fill="#F2C14E" stroke="#1F1A14" strokeWidth="2" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 34, fontWeight: 700, color: "#1F1A14", letterSpacing: -1 }}>mascote</div>
            <div style={{ fontSize: 14, color: "#8A7D6D", textTransform: "uppercase", letterSpacing: 3 }}>
              beta · {lang.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            marginTop: 60,
            fontSize: 92,
            lineHeight: 1.02,
            color: "#1F1A14",
            fontWeight: 400,
            letterSpacing: -2,
            display: "flex",
            maxWidth: 1000,
          }}
        >
          {headline}
        </div>

        {/* Sub */}
        <div
          style={{
            marginTop: 28,
            fontSize: 34,
            color: "#3A322A",
            fontStyle: "italic",
            display: "flex",
          }}
        >
          {sub}
        </div>

        {/* Tags row */}
        <div style={{ marginTop: "auto", display: "flex", gap: 14, alignItems: "center" }}>
          {tags.map((t) => (
            <div
              key={t}
              style={{
                fontSize: 18,
                padding: "10px 22px",
                borderRadius: 999,
                border: "1.5px solid #1F1A14",
                color: "#1F1A14",
                fontFamily: "sans-serif",
                letterSpacing: 1,
                textTransform: "uppercase",
                display: "flex",
              }}
            >
              {t}
            </div>
          ))}
          <div style={{ marginLeft: "auto", color: "#8A7D6D", fontSize: 18, display: "flex" }}>
            meumascote.app
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
