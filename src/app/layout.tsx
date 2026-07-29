import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ballon d'Or — Stats avancées",
  description:
    "Classement, statistiques avancées et fiches joueurs pour le Ballon d'Or.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-pitch/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="text-xl">🏆</span>
              <span className="gold-text text-lg font-bold tracking-tight">
                Ballon d&apos;Or
              </span>
            </Link>
            <div className="flex items-center gap-1 text-sm">
              <NavLink href="/">Classement</NavLink>
              <NavLink href="/compare">Comparateur</NavLink>
              <NavLink href="/bareme">Barème</NavLink>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-white/40">
          Projet Ballon d&apos;Or · saison 2025/2026 · calcul FotMob + barème 2026
        </footer>
      </body>
    </html>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </Link>
  );
}
