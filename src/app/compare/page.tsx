import {
  getEvenementsJoueur,
  getRanking,
  getRepartition,
} from "@/lib/data";
import CompareClient, { type JoueurCompare } from "./CompareClient";

export default function ComparePage() {
  const ranking = getRanking() as (ReturnType<typeof getRanking>[number] & {
    rank: number;
  })[];

  // Pré-calcule pour chaque joueur sa courbe cumulée et sa répartition,
  // exploitées côté client selon la sélection.
  const joueurs: JoueurCompare[] = ranking.map((j) => {
    const evenements = getEvenementsJoueur(j.id);
    let cumul = 0;
    const points = evenements.map((e) => {
      cumul = Math.round((cumul + e.points) * 100) / 100;
      return { date: e.date, value: cumul };
    });
    const repartition = getRepartition(evenements).map((r) => ({
      id: r.categorie.id,
      label: r.categorie.label,
      color: r.categorie.color,
      points: r.points,
    }));
    return {
      id: j.id,
      nom: j.nom,
      club: j.club,
      total: j.total,
      rank: j.rank,
      points,
      repartition,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          <span className="gold-text">Comparateur</span> de joueurs
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Sélectionne jusqu&apos;à 4 joueurs pour comparer leur progression et
          la composition de leurs points.
        </p>
      </div>
      <CompareClient joueurs={joueurs} />
    </div>
  );
}
