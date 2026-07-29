import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllJoueurs, getJoueur, getProduction } from "@/lib/data";
import CumulChart from "@/components/CumulChart";
import RepartitionDonut from "@/components/RepartitionDonut";
import RadarFifa from "@/components/RadarFifa";
import { CATEGORIES } from "@/lib/events";
import { AXES, getRadar } from "@/lib/radar";

export function generateStaticParams() {
  return getAllJoueurs().map((j) => ({ id: String(j.id) }));
}

const PRODUCTION = new Set(["but", "passe"]);

export default function PlayerPage({ params }: { params: { id: string } }) {
  const joueur = getJoueur(Number(params.id));
  if (!joueur) notFound();

  const prod = getProduction().get(joueur.id) ?? { buts: 0, passes: 0 };
  const radar = getRadar([joueur.id])[0];
  const axes = AXES.map((a) => ({ key: a.key, label: a.label }));

  // Courbe cumulée : somme des points au fil des dates.
  let cumul = 0;
  const serie = [
    { name: joueur.nom, color: "#D4AF37", points: [] as { date: string; value: number }[] },
  ];
  for (const e of joueur.evenements) {
    cumul = Math.round((cumul + e.points) * 100) / 100;
    serie[0].points.push({ date: e.date, value: cumul });
  }

  // Faits marquants : tout sauf la production courante (buts/passes de base).
  const marquants = joueur.evenements
    .filter((e) => !PRODUCTION.has(e.categorie))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="space-y-8">
      <Link href="/" className="text-sm text-white/50 hover:text-gold">
        ← Retour au classement
      </Link>

      {/* En-tête */}
      <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-gold/10 px-2.5 py-1 text-sm font-bold text-gold">
              #{joueur.rank}
            </span>
            <h1 className="text-2xl font-bold sm:text-3xl">{joueur.nom}</h1>
          </div>
          <p className="mt-1 text-white/60">
            {joueur.club ?? "Sélection nationale"} ·{" "}
            {joueur.minutes.toLocaleString("fr-FR")} minutes jouées
          </p>
        </div>
        <div className="text-right">
          <div className="gold-text text-4xl font-bold">{joueur.total}</div>
          <div className="text-xs uppercase tracking-wide text-white/40">
            points barème
          </div>
        </div>
      </div>

      {/* Tuiles clés */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        <StatTile value={prod.buts} label="Buts" />
        <StatTile value={prod.passes} label="Passes déc." />
        <StatTile value={joueur.evenements.length} label="Événements" />
        <StatTile value={marquants.length} label="Faits marquants" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Courbe cumulée */}
        <section className="card p-5">
          <h2 className="mb-2 text-lg font-semibold">
            Progression des points
          </h2>
          <CumulChart series={serie} height={360} />
        </section>

        {/* Radar profil barème */}
        <section className="card p-5">
          <h2 className="text-lg font-semibold">Radar — profil barème</h2>
          <p className="mb-2 mt-0.5 text-xs text-white/40">
            Chaque axe normalisé sur 0-100 vs le meilleur du vivier.
          </p>
          <RadarFifa
            axes={axes}
            series={[{ nom: joueur.nom, color: "#D4AF37", valeurs: radar.valeurs }]}
          />
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Répartition */}
        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold">
            Répartition des points
          </h2>
          <RepartitionDonut repartition={joueur.repartition} />
          <div className="mt-4 space-y-1.5">
            {joueur.repartition
              .slice()
              .sort((a, b) => b.points - a.points)
              .map((r) => (
                <div
                  key={r.categorie.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-2 text-white/70">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ background: r.categorie.color }}
                    />
                    {r.categorie.label}
                    <span className="text-white/30">×{r.count}</span>
                  </span>
                  <span className="font-medium text-white">{r.points}</span>
                </div>
              ))}
          </div>
        </section>

        {/* Faits marquants */}
        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold">
            Faits marquants{" "}
            <span className="text-sm font-normal text-white/40">
              ({marquants.length})
            </span>
          </h2>
          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {marquants.length === 0 && (
              <p className="text-sm text-white/50">
                Aucun fait marquant hors production courante.
              </p>
            )}
            {marquants.map((e, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 border-b border-white/5 pb-2 text-sm"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: CATEGORIES[e.categorie].color }}
                  />
                  <span className="truncate text-white/80">{e.libelle}</span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-white/40">{e.date}</span>
                  <span className="w-10 text-right font-medium text-gold">
                    +{e.points}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-[11px] uppercase tracking-wide text-white/40">
        {label}
      </div>
    </div>
  );
}
