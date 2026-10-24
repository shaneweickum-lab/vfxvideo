import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VFXVideo Studio",
    short_name: "VFXVideo",
    description: "An open-source art studio for photo, video, VFX and drawing.",
    start_url: "/",
    display: "standalone",
    background_color: "#141418",
    theme_color: "#141418",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
