"use client";

import { useState } from "react";
import type { Player } from "@/types";
import RadarStats from "@/components/RadarStats";
import CompareBars from "@/components/CompareBars";

const MAX = 4;

export default function CompareClient({ players }: { players: Player[] }) {
  const [selected, setSelected] = useState<string[]>(
    players.slice(0, 2).map((p) => p.id),
  );

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) return prev;
      return [...prev, id];
    });
  }

  const chosen = players.filter((p) => selected.includes(p.id));

  return (
    <div className="space-y-6">
      {/* Sélecteur */}
      <div className="flex flex-wrap gap-2">
        {players.map((p) => {
          const active = selected.includes(p.id);
          const disabled = !active && selected.length >= MAX;
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              disabled={disabled}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                active
                  ? "border-gold bg-gold/15 text-gold"
                  : disabled
                    ? "cursor-not-allowed border-white/10 text-white/25"
                    : "border-white/15 text-white/70 hover:border-white/40 hover:text-white"
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {chosen.length === 0 ? (
        <p className="text-white/50">Sélectionne au moins un joueur.</p>
      ) : (
        <>
          <section className="card p-5">
            <h2 className="mb-2 text-lg font-semibold">Profils comparés</h2>
            <RadarStats players={chosen} />
          </section>
          <CompareBars players={chosen} />
        </>
      )}
    </div>
  );
}
