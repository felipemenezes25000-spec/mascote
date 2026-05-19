import type { CSSProperties } from "react";

export type MascotPhase = "egg" | "baby" | "child" | "teen" | "adult" | "ascended";
export type MascotPersonality = "sage" | "brand" | "coral" | "lilac";

const palette: Record<MascotPersonality, { body: string; accent: string; cheek: string; eye: string }> = {
  sage:   { body: "#FF8030", accent: "#7BAE7A", cheek: "#FF9A7E", eye: "#1F1A14" },
  brand:  { body: "#FF8030", accent: "#F2C14E", cheek: "#FFB46B", eye: "#1F1A14" },
  coral:  { body: "#FF8030", accent: "#F08D7E", cheek: "#FFC4D2", eye: "#1F1A14" },
  lilac:  { body: "#FF8030", accent: "#B395E0", cheek: "#E5C8FF", eye: "#1F1A14" },
};

type Props = {
  phase?: MascotPhase;
  personality?: MascotPersonality;
  size?: number;
  shadow?: boolean;
  animated?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function Mascot({
  phase = "baby",
  personality = "brand",
  size = 260,
  shadow = true,
  animated = true,
  className = "",
  style,
}: Props) {
  const p = palette[personality];
  const blinkClass = animated ? "origin-center [animation:blink_4.5s_ease-in-out_infinite]" : "";
  const swayClass = animated ? "[animation:sway_7s_ease-in-out_infinite] origin-bottom" : "";

  if (phase === "egg") {
    return (
      <svg
        viewBox="0 0 200 240"
        width={size}
        height={(size * 240) / 200}
        className={className}
        style={style}
        aria-label="Mascote: fase ovo"
      >
        <defs>
          <radialGradient id={`egg-${personality}`} cx="42%" cy="38%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="35%" stopColor={p.body} stopOpacity="0.95" />
            <stop offset="100%" stopColor={p.body} />
          </radialGradient>
          {shadow && (
            <filter id={`egg-sh-${personality}`} x="-30%" y="-10%" width="160%" height="140%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feOffset dy="10" />
              <feComposite in2="SourceGraphic" operator="out" />
            </filter>
          )}
        </defs>
        {shadow && (
          <ellipse cx="100" cy="222" rx="56" ry="8" fill="#1F1A14" opacity="0.18" />
        )}
        <g className={swayClass}>
          <ellipse cx="100" cy="115" rx="68" ry="92" fill={`url(#egg-${personality})`} stroke="#1F1A14" strokeWidth="3" />
          <circle cx="76" cy="80" r="9" fill="#FFFFFF" opacity="0.85" />
          <circle cx="120" cy="105" r="4.5" fill="#FFFFFF" opacity="0.6" />
          {/* tiny crack hint */}
          <path d="M 76 158 L 84 168 L 80 178 L 90 184" stroke="#1F1A14" strokeWidth="1.6" fill="none" opacity="0.35" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
      </svg>
    );
  }

  const showBody = phase !== "baby";
  const showArms = phase === "adult" || phase === "ascended";
  const showHalo = phase === "ascended";
  const headScale = phase === "baby" ? 1.08 : phase === "child" ? 0.96 : phase === "teen" ? 0.9 : 0.86;
  const bodyHeight = phase === "child" ? 38 : phase === "teen" ? 56 : phase === "adult" ? 64 : phase === "ascended" ? 64 : 0;

  return (
    <svg
      viewBox="0 0 240 260"
      width={size}
      height={(size * 260) / 240}
      className={className}
      style={style}
      aria-label={`Mascote: fase ${phase}`}
    >
      <defs>
        <radialGradient id={`head-${personality}-${phase}`} cx="40%" cy="34%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
          <stop offset="55%" stopColor={p.body} />
          <stop offset="100%" stopColor="#E5651A" />
        </radialGradient>
        <linearGradient id={`body-${personality}-${phase}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3A322A" />
          <stop offset="100%" stopColor="#1F1A14" />
        </linearGradient>
        {showHalo && (
          <radialGradient id={`halo-${personality}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={p.accent} stopOpacity="0.95" />
            <stop offset="60%" stopColor={p.accent} stopOpacity="0.4" />
            <stop offset="100%" stopColor={p.accent} stopOpacity="0" />
          </radialGradient>
        )}
      </defs>

      {/* shadow */}
      {shadow && <ellipse cx="120" cy="246" rx="70" ry="8" fill="#1F1A14" opacity="0.16" />}

      {/* halo */}
      {showHalo && (
        <ellipse cx="120" cy="60" rx="92" ry="22" fill={`url(#halo-${personality})`} className={animated ? "[animation:pulseGlow_4s_ease-in-out_infinite]" : ""} />
      )}

      {/* body */}
      {showBody && bodyHeight > 0 && (
        <g>
          <rect
            x={120 - 42}
            y={170 - bodyHeight + 16}
            width="84"
            height={bodyHeight + 24}
            rx="22"
            fill={`url(#body-${personality}-${phase})`}
            stroke="#1F1A14"
            strokeWidth="3"
          />
          {/* screen */}
          <rect
            x={120 - 28}
            y={170 - bodyHeight + 28}
            width="56"
            height={Math.max(20, bodyHeight - 8)}
            rx="8"
            fill={p.accent}
            opacity="0.85"
          />
          <rect
            x={120 - 22}
            y={170 - bodyHeight + 34}
            width="14"
            height="3"
            rx="1.5"
            fill="#FBF6F1"
            opacity="0.7"
          />
        </g>
      )}

      {/* arms */}
      {showArms && (
        <>
          <rect x={120 - 60} y={170 - bodyHeight + 30} width="14" height="34" rx="7" fill={`url(#body-${personality}-${phase})`} stroke="#1F1A14" strokeWidth="3" />
          <rect x={120 + 46} y={170 - bodyHeight + 30} width="14" height="34" rx="7" fill={`url(#body-${personality}-${phase})`} stroke="#1F1A14" strokeWidth="3" />
        </>
      )}

      {/* head group */}
      <g
        className={animated ? "[animation:float_6s_ease-in-out_infinite]" : ""}
        style={{ transformOrigin: "120px 110px", transformBox: "fill-box" }}
      >
        <g transform={`translate(120 ${110 - (phase === "baby" ? 12 : 4)}) scale(${headScale})`}>
          {/* antenna */}
          <line x1="0" y1="-78" x2="0" y2="-58" stroke="#1F1A14" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="0" cy="-82" r="6" fill={p.accent} stroke="#1F1A14" strokeWidth="2.5" />
          {/* head */}
          <ellipse cx="0" cy="0" rx="76" ry="68" fill={`url(#head-${personality}-${phase})`} stroke="#1F1A14" strokeWidth="3.5" />
          {/* highlight */}
          <ellipse cx="-30" cy="-26" rx="22" ry="14" fill="#FFFFFF" opacity="0.42" />
          {/* cheeks */}
          <circle cx="-38" cy="14" r="9" fill={p.cheek} opacity="0.85" />
          <circle cx="38" cy="14" r="9" fill={p.cheek} opacity="0.85" />
          {/* eyes */}
          <g className={blinkClass} style={{ transformOrigin: "0 -2px" }}>
            <ellipse cx="-22" cy="-6" rx="6.5" ry="9" fill={p.eye} />
            <ellipse cx="22" cy="-6" rx="6.5" ry="9" fill={p.eye} />
            <circle cx="-20" cy="-9" r="2.4" fill="#FFFFFF" />
            <circle cx="24" cy="-9" r="2.4" fill="#FFFFFF" />
          </g>
          {/* mouth */}
          <path d="M -10 22 Q 0 30 10 22" stroke="#1F1A14" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      </g>

      {/* small accent dot for personality */}
      <circle cx="200" cy="84" r="6" fill={p.accent} opacity="0.85" />
    </svg>
  );
}
