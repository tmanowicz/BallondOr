"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Player } from "@/types";

const METRICS: { key: keyof Player["stats"]; label: string }[] = [
  { key: "goals", label: "Buts" },
  { key: "assists", label: "Passes décisives" },
  { key: "xG", label: "xG" },
  { key: "xA", label: "xA" },
  { key: "keyPasses", label: "Passes clés" },
  { key: "dribblesCompleted", label: "Dribbles réussis" },
];

const COLORS = ["#D4AF37", "#4F9DE0", "#E0685A", "#5AC98A"];

export default function CompareBars({ players }: { players: Player[] }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {METRICS.map((metric) => {
        const data = players.map((p) => ({
          name: p.name.split(" ").slice(-1)[0],
          value: p.stats[metric.key] as number,
        }));
        return (
          <div key={metric.key} className="card p-4">
            <div className="mb-2 text-sm font-medium text-white/70">
              {metric.label}
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" tick={{ fill: "#ffffff80", fontSize: 11 }} />
                <YAxis tick={{ fill: "#ffffff50", fontSize: 11 }} />
                <Tooltip
                  cursor={{ fill: "#ffffff08" }}
                  contentStyle={{
                    background: "#0B141A",
                    border: "1px solid #ffffff20",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
