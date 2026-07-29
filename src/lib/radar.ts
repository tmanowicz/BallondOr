import type { CategorieId } from "@/types";
import { getEvenementsJoueur, getRanking } from "@/lib/data";

// ============================================================================
//  RADAR — profil "barème" d'un joueur, façon FIFA.
// ----------------------------------------------------------------------------
//  Faute de stats brutes FotMob (xG, dribbles, pressing… absentes du fichier
//  d'événements), le radar profile chaque joueur sur les grandes familles du
//  barème. Deux modes d'axe :
//    - "rate" : points de la catégorie ramenés à 90 minutes (production).
//    - "total": points cumulés sur la saison (accomplissements ponctuels).
//  Chaque axe est ensuite normalisé sur 0-100 par rapport au meilleur du
//  vivier, exactement comme un radar de percentiles.
// ============================================================================

export interface AxeRadar {
  key: string;
  label: string;
  categories: CategorieId[];
  mode: "rate" | "total";
}

export const AXES: AxeRadar[] = [
  { key: "buts", label: "BUTS /90", categories: ["but", "bonus_but"], mode: "rate" },
  { key: "passes", label: "PASSES /90", categories: ["passe", "bonus_passe"], mode: "rate" },
  { key: "finale", label: "PHASE\nFINALE", categories: ["bonus_but", "bonus_passe"], mode: "total" },
  { key: "motm", label: "HOMME DU\nMATCH", categories: ["motm"], mode: "total" },
  { key: "parcours", label: "PARCOURS", categories: ["parcours"], mode: "total" },
  { key: "trophees", label: "TROPHÉES", categories: ["champion", "coupe"], mode: "total" },
  { key: "distinctions", label: "DISTINC-\nTIONS", categories: ["distinction", "titre_stat"], mode: "total" },
  { key: "defense", label: "DÉFENSE", categories: ["defense", "clean_sheet"], mode: "total" },
];

/** Valeurs brutes d'un joueur sur chaque axe (avant normalisation). */
function valeursBrutes(id: number): Record<string, number> {
  const evenements = getEvenementsJoueur(id);
  const joueur = getRanking().find((j) => j.id === id);
  const minutes = joueur?.minutes ?? 0;
  const parCat = new Map<string, number>();
  for (const e of evenements) {
    parCat.set(e.categorie, (parCat.get(e.categorie) ?? 0) + e.points);
  }
  const out: Record<string, number> = {};
  for (const axe of AXES) {
    const somme = axe.categories.reduce(
      (acc, c) => acc + (parCat.get(c) ?? 0),
      0,
    );
    out[axe.key] =
      axe.mode === "rate" && minutes > 0 ? (somme / minutes) * 90 : somme;
  }
  return out;
}

/** Maximum de chaque axe sur tout le vivier, pour normaliser à 100. */
function maxParAxe(): Record<string, number> {
  const max: Record<string, number> = {};
  for (const axe of AXES) max[axe.key] = 0;
  for (const j of getRanking()) {
    const v = valeursBrutes(j.id);
    for (const axe of AXES) max[axe.key] = Math.max(max[axe.key], v[axe.key]);
  }
  return max;
}

export interface RadarJoueur {
  id: number;
  nom: string;
  /** valeurs normalisées 0-100 par axe */
  valeurs: Record<string, number>;
  /** valeurs brutes par axe (pour l'infobulle) */
  brutes: Record<string, number>;
}

/** Profil radar normalisé d'un ou plusieurs joueurs. */
export function getRadar(ids: number[]): RadarJoueur[] {
  const max = maxParAxe();
  const ranking = getRanking();
  return ids.map((id) => {
    const brutes = valeursBrutes(id);
    const valeurs: Record<string, number> = {};
    for (const axe of AXES) {
      const m = max[axe.key] || 1;
      valeurs[axe.key] = Math.round((brutes[axe.key] / m) * 100);
    }
    const nom = ranking.find((j) => j.id === id)?.nom ?? String(id);
    return { id, nom, valeurs, brutes };
  });
}
