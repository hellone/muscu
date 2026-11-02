import type { Metadata, Viewport } from "next";
import EnregistrementSW from "@/components/EnregistrementSW";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Muscu – ton coach de séance",
  description: "Séances de musculation optimisées, récupération par muscle et suivi des charges.",
  applicationName: "Muscu",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Muscu", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0e0f12",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {children}
        <EnregistrementSW />
      </body>
    </html>
  );
}
