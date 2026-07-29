import Link from "next/link";
import { getRanking } from "@/lib/data";

export default function HomePage() {
  const ranking = getRanking();
  const podium = ranking.slice(0, 3);
  const maxScore = ranking[0]?.score.total ?? 1;

  return (
    <div className="space-y-10">
      <section className="text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Classement <span className="gold-text">Ballon d&apos;Or</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/60">
          Classement calculé à partir des statistiques avancées et des trophées,
          selon un barème entièrement paramétrable.
        </p>
      </section>

      {/* Podium */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {podium.map((p, i) => (
          <Link
            key={p.id}
            href={`/players/${p.id}`}
            className={`card group relative overflow-hidden p-5 transition hover:border-gold/50 ${
              i === 0 ? "sm:order-2 sm:-translate-y-3" : i === 1 ? "sm:order-1" : "sm:order-3"
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-4xl">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
              </span>
              <span className="gold-text text-2xl font-bold">
                {p.score.total}
                <span className="ml-1 text-xs font-normal text-white/40">pts</span>
              </span>
            </div>
            <div className="text-lg font-semibold group-hover:text-gold">
              {p.name}
            </div>
            <div className="text-sm text-white/50">
              {p.club} · {p.nationality}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-white/60">
              <span>{p.stats.goals} ⚽</span>
              <span>{p.stats.assists} 🅰️</span>
              <span>{p.stats.rating.toFixed(2)} ⭐</span>
            </div>
          </Link>
        ))}
      </section>

      {/* Tableau complet */}
      <section className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-white/40">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Joueur</th>
              <th className="hidden px-4 py-3 sm:table-cell">Club</th>
              <th className="px-4 py-3 text-right">Buts</th>
              <th className="px-4 py-3 text-right">Passes</th>
              <th className="hidden px-4 py-3 text-right md:table-cell">Note</th>
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
                    {p.name}
                  </Link>
                  <div className="text-xs text-white/40">{p.position}</div>
                </td>
                <td className="hidden px-4 py-3 text-white/60 sm:table-cell">
                  {p.club}
                </td>
                <td className="px-4 py-3 text-right">{p.stats.goals}</td>
                <td className="px-4 py-3 text-right">{p.stats.assists}</td>
                <td className="hidden px-4 py-3 text-right md:table-cell">
                  {p.stats.rating.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/10 sm:block">
                      <div
                        className="h-full bg-gradient-to-r from-gold-dark to-gold"
                        style={{ width: `${(p.score.total / maxScore) * 100}%` }}
                      />
                    </div>
                    <span className="font-semibold text-gold">
                      {p.score.total}
                    </span>
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
