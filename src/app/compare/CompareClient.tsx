"use client";

import { useMemo, useState } from "react";
import CumulChart, { type Serie } from "@/components/CumulChart";

export interface JoueurCompare {
  id: number;
  nom: string;
  club: string | null;
  total: number;
  rank: number;
  points: { date: string; value: number }[];
  repartition: { id: string; label: string; color: string; points: number }[];
}

const MAX = 4;
const COULEURS = ["#D4AF37", "#4F9DE0", "#E0685A", "#5AC98A"];

export default function CompareClient({
  joueurs,
}: {
  joueurs: JoueurCompare[];
}) {
  const [selected, setSelected] = useState<number[]>(
    joueurs.slice(0, 2).map((j) => j.id),
  );
  const [filtre, setFiltre] = useState("");

  function toggle(id: number) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) return prev;
      return [...prev, id];
    });
  }

  const chosen = selected
    .map((id) => joueurs.find((j) => j.id === id))
    .filter((j): j is JoueurCompare => Boolean(j));

  const couleurDe = (id: number) =>
    COULEURS[selected.indexOf(id) % COULEURS.length];

  const series: Serie[] = chosen.map((j) => ({
    name: j.nom,
    color: couleurDe(j.id),
    points: j.points,
  }));

  // Toutes les catégories présentes chez les joueurs sélectionnés, pour la
  // comparaison de composition (une ligne par catégorie).
  const categories = useMemo(() => {
    const map = new Map<string, { label: string; color: string }>();
    for (const j of chosen)
      for (const r of j.repartition)
        if (!map.has(r.id)) map.set(r.id, { label: r.label, color: r.color });
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  }, [chosen]);

  const liste = joueurs.filter((j) =>
    j.nom.toLowerCase().includes(filtre.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Sélecteur */}
      <div className="card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-sm text-white/60">
            {selected.length}/{MAX} sélectionnés
          </span>
          <input
            value={filtre}
            onChange={(e) => setFiltre(e.target.value)}
            placeholder="Rechercher un joueur…"
            className="w-48 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm outline-none placeholder:text-white/30 focus:border-gold/50"
          />
        </div>
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {liste.map((j) => {
            const active = selected.includes(j.id);
            const disabled = !active && selected.length >= MAX;
            return (
              <button
                key={j.id}
                onClick={() => toggle(j.id)}
                disabled={disabled}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-transparent text-black"
                    : disabled
                      ? "cursor-not-allowed border-white/10 text-white/25"
                      : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
                }`}
                style={active ? { background: couleurDe(j.id) } : undefined}
              >
                {j.nom}
              </button>
            );
          })}
        </div>
      </div>

      {chosen.length === 0 ? (
        <p className="text-white/50">Sélectionne au moins un joueur.</p>
      ) : (
        <>
          {/* Totaux */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {chosen.map((j) => (
              <div key={j.id} className="card p-4">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: couleurDe(j.id) }}
                  />
                  <span className="truncate text-sm font-medium">{j.nom}</span>
                </div>
                <div className="mt-2 text-2xl font-bold text-gold">
                  {j.total}
                </div>
                <div className="text-xs text-white/40">#{j.rank}</div>
              </div>
            ))}
          </div>

          {/* Courbes cumulées */}
          <section className="card p-5">
            <h2 className="mb-2 text-lg font-semibold">
              Progression comparée
            </h2>
            <CumulChart series={series} height={360} />
          </section>

          {/* Composition par catégorie */}
          <section className="card overflow-x-auto p-5">
            <h2 className="mb-4 text-lg font-semibold">
              Points par catégorie
            </h2>
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-white/40">
                  <th className="pb-2">Catégorie</th>
                  {chosen.map((j) => (
                    <th key={j.id} className="pb-2 text-right">
                      {j.nom.split(" ").slice(-1)[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-t border-white/5">
                    <td className="py-2">
                      <span className="flex items-center gap-2 text-white/70">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: c.color }}
                        />
                        {c.label}
                      </span>
                    </td>
                    {chosen.map((j) => {
                      const pts =
                        j.repartition.find((r) => r.id === c.id)?.points ?? 0;
                      return (
                        <td
                          key={j.id}
                          className={`py-2 text-right ${
                            pts ? "text-white" : "text-white/20"
                          }`}
                        >
                          {pts || "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
