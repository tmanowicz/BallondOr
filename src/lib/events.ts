import type { Categorie, CategorieId } from "@/types";

// Classement d'un libellé d'événement dans l'une des catégories du barème.
// Couvre les 12 familles produites par le pipeline (voir pipeline/bareme.py).
export function classerEvenement(libelle: string): CategorieId {
  const l = libelle;
  if (/^\d+\s+but/.test(l)) return "but";
  if (/^\d+\s+passe/.test(l)) return "passe";
  if (/but decisif/.test(l)) return "bonus_but";
  if (/passe decisive/.test(l)) return "bonus_passe";
  if (/homme du match/.test(l)) return "motm";
  if (/parcours/.test(l)) return "parcours";
  if (/^champion/.test(l)) return "champion";
  if (/^vainqueur/.test(l)) return "coupe";
  if (/meilleure defense/.test(l)) return "defense";
  if (/clean sheet/.test(l)) return "clean_sheet";
  if (/meilleur buteur|meilleur passeur/.test(l)) return "titre_stat";
  if (/^malus/.test(l)) return "malus";
  // MVP, équipe-type, meilleur joueur du championnat, distinctions MLS…
  return "distinction";
}

// Palette cohérente : chaudes pour la production, dorées pour les trophées,
// froides pour les distinctions et le collectif défensif.
export const CATEGORIES: Record<CategorieId, Categorie> = {
  but: { id: "but", label: "Buts", color: "#E0685A" },
  bonus_but: { id: "bonus_but", label: "Buts en phase finale", color: "#C7452F" },
  passe: { id: "passe", label: "Passes décisives", color: "#E8A13C" },
  bonus_passe: { id: "bonus_passe", label: "Passes en phase finale", color: "#C77A1A" },
  parcours: { id: "parcours", label: "Parcours en coupe", color: "#4F9DE0" },
  champion: { id: "champion", label: "Titre de champion", color: "#D4AF37" },
  coupe: { id: "coupe", label: "Coupes & supercoupes", color: "#B9902A" },
  motm: { id: "motm", label: "Homme du match", color: "#8A6BD1" },
  distinction: { id: "distinction", label: "Distinctions individuelles", color: "#5AC98A" },
  titre_stat: { id: "titre_stat", label: "Titre buteur / passeur", color: "#3FA36B" },
  defense: { id: "defense", label: "Meilleure défense", color: "#4FB5C9" },
  clean_sheet: { id: "clean_sheet", label: "Clean sheet", color: "#3C8C99" },
  malus: { id: "malus", label: "Malus saison en club", color: "#9AA3AD" },
};

// Ordre d'affichage stable des catégories (production → trophées → défense).
export const ORDRE_CATEGORIES: CategorieId[] = [
  "but",
  "bonus_but",
  "passe",
  "bonus_passe",
  "parcours",
  "champion",
  "coupe",
  "motm",
  "distinction",
  "titre_stat",
  "defense",
  "clean_sheet",
  "malus",
];

export function categorie(id: CategorieId): Categorie {
  return CATEGORIES[id];
}
