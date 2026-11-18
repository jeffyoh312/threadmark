import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

// Fonts are downloaded at build time and served from our own domain.
const sans = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400"] });

export const metadata: Metadata = {
  title: "Threadmark: long chat, clear next steps",
  description:
    "Paste a conversation and get back the decisions, next steps and open questions, each linked to the lines it came from.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#121320" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <header className="site-header">
          <Link href="/" className="brand">
            <Image src="/mark.png" alt="" width={26} height={26} priority />
            Threadmark
          </Link>
          <nav>
            <Link href="/privacy">Privacy</Link>
            <a href="https://github.com/jeffyoh312/threadmarks">Source</a>
          </nav>
        </header>

        <main className="page">{children}</main>

        <footer className="site-footer">
          Built by <a href="https://github.com/jeffyoh312">Khaled</a>. AI can misread a
          conversation, so check the source lines before acting on a brief.
        </footer>
      </body>
    </html>
  );
}
