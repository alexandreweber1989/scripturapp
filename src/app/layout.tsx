import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Literata, Syne } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { ScripturaProvider } from "@/lib/client/store";
import "./globals.css";

// Syne for the interface; Literata only for long-form scripture text; JetBrains Mono for numbers and labels.
const syne = Syne({ variable: "--font-syne", subsets: ["latin"] });
const literata = Literata({ variable: "--font-literata", subsets: ["latin"], style: ["normal", "italic"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

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
    <html lang="pt-BR" className={`${syne.variable} ${literata.variable} ${mono.variable} antialiased`}>
      <body>
        <ScripturaProvider>
          <AppShell>{children}</AppShell>
        </ScripturaProvider>
      </body>
    </html>
  );
}
