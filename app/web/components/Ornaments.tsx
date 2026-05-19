import type { SVGProps } from "react";

export function StarBurst(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 60 60" fill="none" {...props}>
      <path
        d="M30 4 L33 23 L52 26 L33 30 L30 56 L27 30 L8 26 L27 23 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Squiggle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 24" fill="none" {...props}>
      <path
        d="M2 12 Q 14 2, 26 12 T 50 12 T 74 12 T 98 12 T 118 12"
        stroke="currentColor"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Sparkle(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" {...props}>
      <path
        d="M10 0 L11.5 8.5 L20 10 L11.5 11.5 L10 20 L8.5 11.5 L0 10 L8.5 8.5 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Sun(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 80 80" fill="none" {...props}>
      <circle cx="40" cy="40" r="14" fill="currentColor" />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2;
        const x1 = 40 + Math.cos(a) * 22;
        const y1 = 40 + Math.sin(a) * 22;
        const x2 = 40 + Math.cos(a) * 34;
        const y2 = 40 + Math.sin(a) * 34;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="3" strokeLinecap="round" />;
      })}
    </svg>
  );
}

export function MoonSliver(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 60 60" fill="none" {...props}>
      <path
        d="M44 8 A 26 26 0 1 0 44 52 A 18 18 0 1 1 44 8 Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function HeartBlock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 40 36" fill="none" {...props}>
      <path
        d="M20 33 L4 18 Q -2 8 6 4 Q 14 0 20 9 Q 26 0 34 4 Q 42 8 36 18 Z"
        fill="currentColor"
        stroke="#1F1A14"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 36" fill="none" {...props}>
      <line x1="12" y1="2" x2="12" y2="30" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M4 22 L 12 32 L 20 22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function BrandWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-display font-bold tracking-tight lowercase ${className}`}>
      mascote
    </span>
  );
}
