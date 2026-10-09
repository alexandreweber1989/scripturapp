import type { Metadata, Viewport } from "next";
import { Literata, Manrope } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { ScripturaProvider } from "@/lib/client/store";
import "./globals.css";

const scripture = Literata({ variable: "--font-scripture", subsets: ["latin"], style: ["normal", "italic"] });
const ui = Manrope({ variable: "--font-ui", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Scriptura — estude a Bíblia jogando", template: "%s · Scriptura" },
  description: "Leia a Bíblia, complete missões, jogue e converse com seu mentor. Uma jornada gamificada pelas Escrituras.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f1e7" },
    { media: "(prefers-color-scheme: dark)", color: "#11131b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${scripture.variable} ${ui.variable} antialiased`}>
      <body>
        <ScripturaProvider>
          <AppShell>{children}</AppShell>
        </ScripturaProvider>
      </body>
    </html>
  );
}
