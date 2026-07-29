// Modèle de données du projet Ballon d'Or.
// Remplace le JSON d'exemple (src/data/players.json) par tes vraies données
// en respectant ces types, et tout le site s'adaptera automatiquement.

export type TrophyScope = "club" | "international" | "individual";

export interface Trophy {
  name: string;
  scope: TrophyScope;
}

export interface PlayerSeasonStats {
  appearances: number;
  goals: number;
  assists: number;
  minutes: number;
  /** Expected goals (buts attendus) */
  xG: number;
  /** Expected assists (passes décisives attendues) */
  xA: number;
  keyPasses: number;
  shots: number;
  dribblesCompleted: number;
  passAccuracy: number; // pourcentage 0-100
  tackles: number;
  interceptions: number;
  /** Note moyenne par match (échelle type 0-10) */
  rating: number;
  cleanSheets?: number;
}

export interface Player {
  id: string;
  name: string;
  club: string;
  nationality: string;
  position: string;
  age: number;
  /** URL d'une photo (optionnel) */
  photo?: string;
  season: string;
  stats: PlayerSeasonStats;
  trophies: Trophy[];
}

/** Résultat du calcul du barème pour un joueur. */
export interface ScoreBreakdown {
  total: number;
  statPoints: number;
  trophyPoints: number;
  details: { label: string; points: number }[];
}

export interface RankedPlayer extends Player {
  score: ScoreBreakdown;
  rank: number;
}
