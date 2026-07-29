"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { RepartitionCategorie } from "@/types";

export default function RepartitionDonut({
  repartition,
  height = 260,
}: {
  repartition: RepartitionCategorie[];
  height?: number;
}) {
  const data = repartition.map((r) => ({
    name: r.categorie.label,
    value: Math.max(0, r.points),
    color: r.categorie.color,
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="82%"
          paddingAngle={2}
          stroke="none"
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v: number, n: string) => [`${v} pts`, n]}
          contentStyle={{
            background: "#0B141A",
            border: "1px solid #ffffff20",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
