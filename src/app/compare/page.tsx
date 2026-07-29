import { getAllPlayers } from "@/lib/data";
import CompareClient from "./CompareClient";

export default function ComparePage() {
  const players = getAllPlayers();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          <span className="gold-text">Comparateur</span> de joueurs
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Sélectionne jusqu&apos;à 4 joueurs pour comparer leurs profils.
        </p>
      </div>
      <CompareClient players={players} />
    </div>
  );
}
