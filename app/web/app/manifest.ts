import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mascote — Cuide de você. Ele evolui junto.",
    short_name: "Mascote",
    description: "Companheiro digital brasileiro de autocuidado. Anti-grind, local-first, com 4 personalidades.",
    start_url: "/pt",
    display: "standalone",
    background_color: "#FBF6F1",
    theme_color: "#FF8030",
    orientation: "portrait",
    icons: [
      { src: "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    categories: ["lifestyle", "health", "productivity"],
    lang: "pt-BR",
  };
}
