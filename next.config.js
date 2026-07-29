/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Export statique : génère un dossier `out/` déployable sur GitHub Pages.
  output: "export",
  // Un site "projet" GitHub Pages est servi sous /<repo>. Le workflow fournit
  // ce préfixe via PAGES_BASE_PATH ; en local il reste vide.
  basePath: process.env.PAGES_BASE_PATH || "",
  assetPrefix: process.env.PAGES_BASE_PATH || undefined,
  // Pas d'optimiseur d'images côté serveur en export statique.
  images: { unoptimized: true },
  // URLs en /chemin/ (dossiers) : plus robuste sur Pages.
  trailingSlash: true,
};

module.exports = nextConfig;
