"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

export interface Serie {
  name: string;
  color: string;
  points: { date: string; value: number }[];
}

// Fusionne plusieurs séries cumulées sur un axe de dates commun, en
// reportant la dernière valeur connue de chaque joueur (forward-fill) afin
// que les courbes restent continues même les jours sans événement.
function fusionner(series: Serie[]) {
  const dates = Array.from(
    new Set(series.flatMap((s) => s.points.map((p) => p.date))),
  ).sort();
  const dernier: Record<string, number> = {};
  return dates.map((date) => {
    const row: Record<string, number | string> = { date };
    for (const s of series) {
      const pt = s.points.find((p) => p.date === date);
      if (pt) dernier[s.name] = pt.value;
      row[s.name] = dernier[s.name] ?? 0;
    }
    return row;
  });
}

function moisCourt(date: string): string {
  const [, m] = date.split("-");
  return ["", "jan", "fév", "mar", "avr", "mai", "juin", "juil", "aoû", "sep", "oct", "nov", "déc"][
    parseInt(m, 10)
  ];
}

export default function CumulChart({
  series,
  height = 320,
}: {
  series: Serie[];
  height?: number;
}) {
  const data = fusionner(series);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
        <XAxis
          dataKey="date"
          tickFormatter={moisCourt}
          tick={{ fill: "#ffffff70", fontSize: 11 }}
          minTickGap={28}
        />
        <YAxis tick={{ fill: "#ffffff50", fontSize: 11 }} width={40} />
        <Tooltip
          contentStyle={{
            background: "#0B141A",
            border: "1px solid #ffffff20",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#ffffff90" }}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => (
          <Line
            key={s.name}
            type="monotone"
            dataKey={s.name}
            stroke={s.color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
