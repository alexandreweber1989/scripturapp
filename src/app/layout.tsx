import type { Metadata, Viewport } from "next";
import { Literata, Manrope, Syne } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { ScripturaProvider } from "@/lib/client/store";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-boot";
import "./globals.css";

// Syne for titles; Manrope for everything else (text, labels, numbers); Literata only for long-form scripture text.
const syne = Syne({ variable: "--font-syne", subsets: ["latin"] });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const literata = Literata({ variable: "--font-literata", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "Scriptura — estude a Bíblia jogando", template: "%s · Scriptura" },
  description: "Leia a Bíblia, complete missões, jogue e converse com seu mentor. Uma jornada gamificada pelas Escrituras.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1218" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set by the boot script before paint; the DOM value wins over the server default.
    <html lang="pt-BR" data-theme="light" suppressHydrationWarning className={`${syne.variable} ${manrope.variable} ${literata.variable} antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <ScripturaProvider>
          <AppShell>{children}</AppShell>
        </ScripturaProvider>
      </body>
    </html>
  );
}
