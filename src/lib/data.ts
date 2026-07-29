import raw from "@/data/bareme_events.json";
import type {
  BaremeExport,
  Evenement,
  Joueur,
  JoueurDetail,
  RepartitionCategorie,
} from "@/types";
import { CATEGORIES, ORDRE_CATEGORIES, classerEvenement } from "@/lib/events";

const data = raw as BaremeExport;

export function getSaison(): string {
  return data.saison;
}

/** Joueurs classés par total décroissant, avec leur rang (1 = meilleur). */
export function getRanking(): Joueur[] {
  return [...data.joueurs]
    .sort((a, b) => b.total - a.total)
    .map((j, i) => ({ ...j, rank: i + 1 }) as Joueur & { rank: number });
}

/** Tous les événements, sous forme nommée et triés par date. */
export function getEvenements(): Evenement[] {
  return data.evenements
    .map(([date, playerId, points, libelle]) => ({
      date,
      playerId,
      points,
      libelle,
      categorie: classerEvenement(libelle),
    }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

/** Événements d'un joueur donné, triés par date. */
export function getEvenementsJoueur(id: number): Evenement[] {
  return getEvenements().filter((e) => e.playerId === id);
}

/** Répartition des points d'un joueur par catégorie (ordre stable). */
export function getRepartition(evenements: Evenement[]): RepartitionCategorie[] {
  const acc = new Map<string, { points: number; count: number }>();
  for (const e of evenements) {
    const cur = acc.get(e.categorie) ?? { points: 0, count: 0 };
    cur.points += e.points;
    cur.count += 1;
    acc.set(e.categorie, cur);
  }
  return ORDRE_CATEGORIES.filter((id) => acc.has(id)).map((id) => ({
    categorie: CATEGORIES[id],
    points: round2(acc.get(id)!.points),
    count: acc.get(id)!.count,
  }));
}

/** Fiche complète d'un joueur (rang, événements, répartition). */
export function getJoueur(id: number): JoueurDetail | undefined {
  const ranking = getRanking();
  const base = ranking.find((j) => j.id === id) as
    | (Joueur & { rank: number })
    | undefined;
  if (!base) return undefined;
  const evenements = getEvenementsJoueur(id);
  return {
    ...base,
    evenements,
    repartition: getRepartition(evenements),
  };
}

export function getAllJoueurs(): Joueur[] {
  return data.joueurs;
}

/** Compte les buts et passes décisives (lus dans les libellés « N but(s) »). */
export function getProduction(): Map<number, { buts: number; passes: number }> {
  const acc = new Map<number, { buts: number; passes: number }>();
  for (const [, playerId, , libelle] of data.evenements) {
    const mBut = /^(\d+)\s+but/.exec(libelle);
    const mPasse = /^(\d+)\s+passe/.exec(libelle);
    if (!mBut && !mPasse) continue;
    const cur = acc.get(playerId) ?? { buts: 0, passes: 0 };
    if (mBut) cur.buts += parseInt(mBut[1], 10);
    if (mPasse) cur.passes += parseInt(mPasse[1], 10);
    acc.set(playerId, cur);
  }
  return acc;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
