import type { Player, ScoreBreakdown } from "@/types";

// ============================================================================
//  BARÈME — Ballon d'Or
// ----------------------------------------------------------------------------
//  Ceci est un barème PAR DÉFAUT, transparent et modifiable.
//  👉 Remplace les poids ci-dessous par ceux de ton propre barème.
//  Chaque joueur reçoit des points pour ses statistiques et ses trophées.
// ============================================================================

export interface ScoringWeights {
  perGoal: number;
  perAssist: number;
  perKeyPass: number;
  perDribble: number;
  /** Points par dixième de note au-dessus de 6.0 (proxy de régularité) */
  perRatingPointAbove6: number;
  /** Points par but/passe attendu (xG + xA) */
  perExpectedContribution: number;
  /** Points selon la portée du trophée */
  trophyPoints: Record<string, number>;
  /** Bonus pour certains trophées nommés (insensible à la casse) */
  namedTrophyBonus: Record<string, number>;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  perGoal: 2.5,
  perAssist: 1.5,
  perKeyPass: 0.1,
  perDribble: 0.15,
  perRatingPointAbove6: 8,
  perExpectedContribution: 0.4,
  trophyPoints: {
    club: 6,
    international: 20,
    individual: 4,
  },
  namedTrophyBonus: {
    "champions league": 15,
    "world cup": 30,
    "coupe du monde": 30,
    "ligue des champions": 15,
    euro: 18,
    "copa america": 16,
  },
};

/** Calcule le détail du score d'un joueur selon un barème. */
export function computeScore(
  player: Player,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): ScoreBreakdown {
  const s = player.stats;
  const details: { label: string; points: number }[] = [];

  const goalPts = s.goals * weights.perGoal;
  const assistPts = s.assists * weights.perAssist;
  const keyPassPts = s.keyPasses * weights.perKeyPass;
  const dribblePts = s.dribblesCompleted * weights.perDribble;
  const ratingPts =
    Math.max(0, s.rating - 6) * 10 * weights.perRatingPointAbove6 / 10;
  const xPts = (s.xG + s.xA) * weights.perExpectedContribution;

  details.push({ label: `${s.goals} buts`, points: goalPts });
  details.push({ label: `${s.assists} passes décisives`, points: assistPts });
  details.push({ label: `${s.keyPasses} passes clés`, points: keyPassPts });
  details.push({ label: `${s.dribblesCompleted} dribbles réussis`, points: dribblePts });
  details.push({ label: `Note moyenne ${s.rating.toFixed(2)}`, points: ratingPts });
  details.push({ label: `xG+xA (${(s.xG + s.xA).toFixed(1)})`, points: xPts });

  const statPoints =
    goalPts + assistPts + keyPassPts + dribblePts + ratingPts + xPts;

  let trophyPoints = 0;
  for (const t of player.trophies) {
    const base = weights.trophyPoints[t.scope] ?? 0;
    const bonus = weights.namedTrophyBonus[t.name.toLowerCase()] ?? 0;
    const pts = base + bonus;
    trophyPoints += pts;
    details.push({ label: `🏆 ${t.name}`, points: pts });
  }

  return {
    total: round(statPoints + trophyPoints),
    statPoints: round(statPoints),
    trophyPoints: round(trophyPoints),
    details: details.map((d) => ({ ...d, points: round(d.points) })),
  };
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
