import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPlayers, getRankedPlayer } from "@/lib/data";
import RadarStats from "@/components/RadarStats";

export function generateStaticParams() {
  return getAllPlayers().map((p) => ({ id: p.id }));
}

export default function PlayerPage({ params }: { params: { id: string } }) {
  const player = getRankedPlayer(params.id);
  if (!player) notFound();

  const s = player.stats;
  const statTiles: { label: string; value: string | number }[] = [
    { label: "Matchs", value: s.appearances },
    { label: "Buts", value: s.goals },
    { label: "Passes déc.", value: s.assists },
    { label: "Minutes", value: s.minutes },
    { label: "xG", value: s.xG.toFixed(1) },
    { label: "xA", value: s.xA.toFixed(1) },
    { label: "Passes clés", value: s.keyPasses },
    { label: "Dribbles", value: s.dribblesCompleted },
    { label: "Précision passes", value: `${s.passAccuracy}%` },
    { label: "Tacles", value: s.tackles },
    { label: "Interceptions", value: s.interceptions },
    { label: "Note moyenne", value: s.rating.toFixed(2) },
  ];

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
              #{player.rank}
            </span>
            <h1 className="text-2xl font-bold sm:text-3xl">{player.name}</h1>
          </div>
          <p className="mt-1 text-white/60">
            {player.position} · {player.club} · {player.nationality} ·{" "}
            {player.age} ans
          </p>
        </div>
        <div className="text-right">
          <div className="gold-text text-4xl font-bold">
            {player.score.total}
          </div>
          <div className="text-xs uppercase tracking-wide text-white/40">
            points barème
          </div>
        </div>
      </div>

      {/* Tuiles de stats */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {statTiles.map((t) => (
          <div key={t.label} className="card p-3 text-center">
            <div className="text-xl font-semibold text-white">{t.value}</div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-white/40">
              {t.label}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Radar */}
        <section className="card p-5">
          <h2 className="mb-2 text-lg font-semibold">Profil statistique</h2>
          <RadarStats players={[player]} />
        </section>

        {/* Détail du score */}
        <section className="card p-5">
          <h2 className="mb-4 text-lg font-semibold">Détail du barème</h2>
          <div className="space-y-2">
            {player.score.details.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-white/5 pb-2 text-sm"
              >
                <span className="text-white/70">{d.label}</span>
                <span
                  className={
                    d.points >= 0 ? "font-medium text-gold" : "text-red-400"
                  }
                >
                  +{d.points}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 text-sm">
              <span className="text-white/50">Sous-total statistiques</span>
              <span className="font-medium">{player.score.statPoints}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/50">Sous-total trophées</span>
              <span className="font-medium">{player.score.trophyPoints}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-3 text-base font-bold">
              <span>Total</span>
              <span className="gold-text">{player.score.total}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Trophées */}
      {player.trophies.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">Palmarès de la saison</h2>
          <div className="flex flex-wrap gap-2">
            {player.trophies.map((t, i) => (
              <span
                key={i}
                className="rounded-full border border-gold/30 bg-gold/5 px-3 py-1 text-sm text-gold"
              >
                🏆 {t.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
