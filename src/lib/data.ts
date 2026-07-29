import playersData from "@/data/players.json";
import type { Player, RankedPlayer } from "@/types";
import { computeScore } from "@/lib/scoring";

const players = playersData as Player[];

/** Tous les joueurs, sans classement. */
export function getAllPlayers(): Player[] {
  return players;
}

/** Un joueur par son id. */
export function getPlayer(id: string): Player | undefined {
  return players.find((p) => p.id === id);
}

/** Joueurs classés par score décroissant (calcul du barème). */
export function getRanking(): RankedPlayer[] {
  return players
    .map((p) => ({ ...p, score: computeScore(p) }))
    .sort((a, b) => b.score.total - a.score.total)
    .map((p, i) => ({ ...p, rank: i + 1 }));
}

/** Le joueur classé (avec score) par son id. */
export function getRankedPlayer(id: string): RankedPlayer | undefined {
  return getRanking().find((p) => p.id === id);
}
