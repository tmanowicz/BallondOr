import type { CategorieId } from "@/types";
import { getEvenementsJoueur, getRanking } from "@/lib/data";
import radarStatsRaw from "@/data/radar_stats.json";

// ============================================================================
//  RADAR — deux modes, bascule automatique.
// ----------------------------------------------------------------------------
//  MODE FOTMOB (préféré) : si src/data/radar_stats.json contient des joueurs
//  (généré par pipeline/export_radar.py depuis fotmob.db), le radar utilise les
//  vrais axes façon FIFA — xG, xA, occasions créées, dribbles, pressing,
//  tacles+int — déjà ramenés à 90 minutes.
//
//  MODE BARÈME (secours) : sans ce fichier, le radar profile chaque joueur sur
//  les grandes familles du barème (buts, passes, phase finale, trophées…).
//
//  Dans les deux cas, chaque axe est normalisé sur 0-100 par rapport au
//  meilleur du vivier, comme un radar de percentiles.
// ============================================================================

export interface AxeRadar {
  key: string;
  label: string;
}

interface RadarStatJoueur {
  id: number;
  nom: string;
  minutes: number;
  [axe: string]: number | string;
}

const radarStats = radarStatsRaw as { par: string; joueurs: RadarStatJoueur[] };
const STATS_PAR_ID = new Map(radarStats.joueurs.map((j) => [j.id, j]));

/** Vrai si des stats FotMob sont disponibles (mode FIFA actif). */
export const RADAR_FOTMOB = radarStats.joueurs.length > 0;

// --- Axes façon FIFA (mode FotMob) ---------------------------------------
const AXES_FIFA: AxeRadar[] = [
  { key: "buts", label: "BUTS /90" },
  { key: "xg", label: "xG /90" },
  { key: "xa", label: "xA /90" },
  { key: "occasions_creees", label: "OCCASIONS\nCRÉÉES" },
  { key: "dribbles", label: "DRIBBLES\n/90" },
  { key: "pressing_haut", label: "PRESSING\nHAUT" },
  { key: "tacles_int", label: "TACLES\n+ INT." },
  { key: "buts_passes", label: "BUTS+PASSES\n/90" },
];

// --- Axes profil barème (mode secours) -----------------------------------
interface AxeBareme extends AxeRadar {
  categories: CategorieId[];
  mode: "rate" | "total";
}
const AXES_BAREME: AxeBareme[] = [
  { key: "buts", label: "BUTS /90", categories: ["but", "bonus_but"], mode: "rate" },
  { key: "passes", label: "PASSES /90", categories: ["passe", "bonus_passe"], mode: "rate" },
  { key: "finale", label: "PHASE\nFINALE", categories: ["bonus_but", "bonus_passe"], mode: "total" },
  { key: "motm", label: "HOMME DU\nMATCH", categories: ["motm"], mode: "total" },
  { key: "parcours", label: "PARCOURS", categories: ["parcours"], mode: "total" },
  { key: "trophees", label: "TROPHÉES", categories: ["champion", "coupe"], mode: "total" },
  { key: "distinctions", label: "DISTINC-\nTIONS", categories: ["distinction", "titre_stat"], mode: "total" },
  { key: "defense", label: "DÉFENSE", categories: ["defense", "clean_sheet"], mode: "total" },
];

/** Axes actifs (dépend du mode). Utilisé par les pages pour l'affichage. */
export function getRadarAxes(): AxeRadar[] {
  return RADAR_FOTMOB
    ? AXES_FIFA.map(({ key, label }) => ({ key, label }))
    : AXES_BAREME.map(({ key, label }) => ({ key, label }));
}

/** Rétro-compatibilité : les pages importaient AXES. */
export const AXES = getRadarAxes();

function valeursBrutes(id: number): Record<string, number> {
  if (RADAR_FOTMOB) {
    const s = STATS_PAR_ID.get(id);
    const out: Record<string, number> = {};
    for (const axe of AXES_FIFA) {
      const v = s?.[axe.key];
      out[axe.key] = typeof v === "number" ? v : 0;
    }
    return out;
  }
  // Mode barème.
  const evenements = getEvenementsJoueur(id);
  const minutes = getRanking().find((j) => j.id === id)?.minutes ?? 0;
  const parCat = new Map<string, number>();
  for (const e of evenements) {
    parCat.set(e.categorie, (parCat.get(e.categorie) ?? 0) + e.points);
  }
  const out: Record<string, number> = {};
  for (const axe of AXES_BAREME) {
    const somme = axe.categories.reduce((a, c) => a + (parCat.get(c) ?? 0), 0);
    out[axe.key] =
      axe.mode === "rate" && minutes > 0 ? (somme / minutes) * 90 : somme;
  }
  return out;
}

function maxParAxe(): Record<string, number> {
  const axes = getRadarAxes();
  const max: Record<string, number> = {};
  for (const axe of axes) max[axe.key] = 0;
  // Le vivier de normalisation : joueurs FotMob si dispo, sinon le classement.
  const ids = RADAR_FOTMOB
    ? radarStats.joueurs.map((j) => j.id)
    : getRanking().map((j) => j.id);
  for (const id of ids) {
    const v = valeursBrutes(id);
    for (const axe of axes) max[axe.key] = Math.max(max[axe.key], v[axe.key]);
  }
  return max;
}

export interface RadarJoueur {
  id: number;
  nom: string;
  valeurs: Record<string, number>;
  brutes: Record<string, number>;
}

/** Profil radar normalisé (0-100) d'un ou plusieurs joueurs. */
export function getRadar(ids: number[]): RadarJoueur[] {
  const max = maxParAxe();
  const axes = getRadarAxes();
  const ranking = getRanking();
  return ids.map((id) => {
    const brutes = valeursBrutes(id);
    const valeurs: Record<string, number> = {};
    for (const axe of axes) {
      const m = max[axe.key] || 1;
      valeurs[axe.key] = Math.round((brutes[axe.key] / m) * 100);
    }
    const nom =
      STATS_PAR_ID.get(id)?.nom ??
      ranking.find((j) => j.id === id)?.nom ??
      String(id);
    return { id, nom, valeurs, brutes };
  });
}
