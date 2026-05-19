export const SITE = {
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://mascote-teste.vercel.app",
  name: "Mascote",
  twitter: "@meumascote",
  emailHello: "oi@meumascote.app",
  emailPress: "imprensa@meumascote.app",
  themeColor: "#FF8030",
  bg: "#FBF6F1",
  social: {
    instagram: "https://instagram.com/meumascote",
    tiktok: "https://tiktok.com/@meumascote",
    twitter: "https://twitter.com/meumascote",
    youtube: "https://youtube.com/@meumascote",
    github: "https://github.com/meumascote",
  },
  analytics: {
    gaId: process.env.NEXT_PUBLIC_GA_ID || "",
    plausibleDomain: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN || "",
  },
} as const;
