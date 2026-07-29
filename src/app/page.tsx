import Link from "next/link";
import { getProduction, getRanking, getSaison } from "@/lib/data";

export default function HomePage() {
  const ranking = getRanking() as (ReturnType<typeof getRanking>[number] & {
    rank: number;
  })[];
  const prod = getProduction();
  const podium = ranking.slice(0, 3);
  const maxTotal = ranking[0]?.total ?? 1;

  return (
    <div className="space-y-10">
      <section className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Classement <span className="gold-text">Ballon d&apos;Or</span>
        </h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-white/60">
          Saison {getSaison()} — {ranking.length} joueurs classés selon le
          barème 2026, calculé automatiquement sur les données FotMob (buts,
          passes, parcours, trophées) et les distinctions officielles.
        </p>
      </section>

      {/* Podium */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {podium.map((p, i) => (
          <Link
            key={p.id}
            href={`/players/${p.id}`}
            className={`card group relative overflow-hidden p-5 transition hover:border-gold/50 ${
              i === 0
                ? "sm:order-2 sm:-translate-y-3"
                : i === 1
                  ? "sm:order-1"
                  : "sm:order-3"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-4xl">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
              </span>
              <span className="gold-text text-3xl font-bold">
                {p.total}
                <span className="ml-1 text-xs font-normal text-white/40">
                  pts
                </span>
              </span>
            </div>
            <div className="text-lg font-semibold group-hover:text-gold">
              {p.nom}
            </div>
            <div className="text-sm text-white/50">
              {p.club ?? "Sélection"}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-white/60">
              <span>{prod.get(p.id)?.buts ?? 0} ⚽</span>
              <span>{prod.get(p.id)?.passes ?? 0} 🅰️</span>
              <span>{p.minutes.toLocaleString("fr-FR")} min</span>
            </div>
          </Link>
        ))}
      </section>

      {/* Tableau complet */}
      <section className="card overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Joueur</th>
              <th className="hidden px-4 py-3 sm:table-cell">Club</th>
              <th className="px-4 py-3 text-right">Buts</th>
              <th className="px-4 py-3 text-right">Passes</th>
              <th className="hidden px-4 py-3 text-right md:table-cell">
                Minutes
              </th>
              <th className="px-4 py-3 text-right">Score</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((p) => (
              <tr
                key={p.id}
                className="border-b border-white/5 transition hover:bg-white/5"
              >
                <td className="px-4 py-3 font-mono text-white/50">{p.rank}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/players/${p.id}`}
                    className="font-medium hover:text-gold"
                  >
                    {p.nom}
                  </Link>
                </td>
                <td className="hidden px-4 py-3 text-white/60 sm:table-cell">
                  {p.club ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {prod.get(p.id)?.buts ?? 0}
                </td>
                <td className="px-4 py-3 text-right">
                  {prod.get(p.id)?.passes ?? 0}
                </td>
                <td className="hidden px-4 py-3 text-right text-white/60 md:table-cell">
                  {p.minutes.toLocaleString("fr-FR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/10 sm:block">
                      <div
                        className="h-full bg-gradient-to-r from-gold-dark to-gold"
                        style={{ width: `${(p.total / maxTotal) * 100}%` }}
                      />
                    </div>
                    <span className="font-semibold text-gold">{p.total}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
