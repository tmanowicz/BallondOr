import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Barème — Ballon d'Or 2026",
};

const PHASES = ["Seiziemes", "Huitiemes", "Quarts", "Demi-finales", "3e place", "Finale"];

const BUTS = {
  LDC: [2, 4, 7, 13, "—", 25],
  CdM: [3, 5, 9, 18, 10, 35],
  "Europa L.": [1, 2, 3, 5, "—", 10],
  "Conf. L.": [1, 1, 2, 3, "—", 5],
};
const PASSES = {
  LDC: [2, 3, 5, 10, "—", 20],
  CdM: [2, 4, 8, 15, 5, 30],
  "Europa L.": [1, 1, 2, 4, "—", 8],
  "Conf. L.": [1, 1, 2, 3, "—", 5],
};
const MOTM = {
  LDC: [2, 4, 8, 15, "—", 30],
  CdM: [3, 5, 10, 20, 10, 40],
  "Europa L.": [1, 2, 3, 5, "—", 10],
  "Conf. L.": [1, 1, 2, 3, "—", 5],
};

const PARCOURS = [
  ["Vainqueur", 40, 50, 30, 20],
  ["Finaliste", 20, 25, 15, 10],
  ["Demi-finaliste", 10, 13, 8, 5],
  ["Quart de finaliste", 5, 7, 4, 3],
];

const DISTINCTIONS: [string, number][] = [
  ["MVP de la Coupe du monde", 100],
  ["MVP de la Ligue des champions", 75],
  ["Équipe-type de la Coupe du monde", 50],
  ["Équipe-type de la Ligue des champions", 35],
  ["Meilleur joueur du championnat", 15],
  ["MVP de l'Europa League", 15],
  ["Équipe-type des 5 grands championnats", 10],
  ["Équipe-type de l'Europa League", 10],
  ["MVP de la Conference League", 8],
  ["Équipe-type de la Conference League", 4],
];

export default function BaremePage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">
          <span className="gold-text">Barème</span> Ballon d&apos;Or 2026
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-white/60">
          Chaque point du classement est attribué par ces règles. Production et
          parcours sont calculés automatiquement sur ~3 963 matchs FotMob ; les
          distinctions et hommes du match sont saisis à la main (sources UEFA /
          FIFA).
        </p>
      </div>

      {/* Production */}
      <Section titre="1. Production" sous="Toutes compétitions confondues">
        <div className="flex flex-wrap gap-3">
          <Pastille valeur="1 pt" texte="par but" />
          <Pastille valeur="0,75 pt" texte="par passe décisive" />
        </div>
      </Section>

      {/* Parcours */}
      <Section titre="2. Parcours en coupe" sous="À tout joueur ayant disputé la compétition">
        <Table
          entetes={["", "LDC", "Coupe du monde", "Europa L.", "Conf. L."]}
          lignes={PARCOURS.map((r) => r.map(String))}
        />
      </Section>

      {/* Trophées domestiques */}
      <Section titre="3. Trophées domestiques">
        <div className="flex flex-wrap gap-3">
          <Pastille valeur="25" texte="Championnat" />
          <Pastille valeur="10" texte="Coupe nationale" />
          <Pastille valeur="5" texte="Supercoupe" />
        </div>
      </Section>

      {/* Phase finale */}
      <Section titre="4-6. Bonus de phase finale" sous="Cumulables sur un même match (but + homme du match, etc.)">
        <div className="space-y-6">
          <SousTable titre="Buts en phase finale" data={BUTS} />
          <SousTable titre="Passes décisives en phase finale" data={PASSES} />
          <SousTable titre="Hommes du match" data={MOTM} />
        </div>
      </Section>

      {/* Distinctions */}
      <Section titre="7. Distinctions individuelles">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {DISTINCTIONS.map(([nom, pts]) => (
            <div
              key={nom}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm"
            >
              <span className="text-white/70">{nom}</span>
              <span className="font-semibold text-gold">{pts}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Titres statistiques */}
      <Section titre="8. Titres de buteur, passeur et meilleure défense">
        <Table
          entetes={["", "Buteur", "Passeur", "Défense"]}
          lignes={[
            ["Championnat", "10", "8", "6"],
            ["Ligue des champions", "20", "16", "12"],
            ["Coupe du monde", "30", "24", "18"],
          ]}
        />
      </Section>

      {/* Coefficients */}
      <Section titre="9. Coefficients">
        <div className="space-y-2 text-sm text-white/70">
          <p>
            <span className="font-medium text-white">Championnats hors des 5 grands</span>{" "}
            (Liga Portugal, Eredivisie, Süper Lig, MLS…) : production et
            distinctions <b className="text-gold">au quart</b>, coupe nationale
            associée <b className="text-gold">à la moitié</b>.
          </p>
          <p>
            <span className="font-medium text-white">Remplaçants en phase finale de LDC / CdM</span> :
            titulaire si &gt; 50 % des matchs de phase finale démarrés, sinon{" "}
            <b className="text-gold">demi-tarif</b> sur les points de cette
            compétition. Un joueur titularisé <b className="text-gold">en demi ET
            en finale</b> est toujours considéré titulaire de la campagne.
          </p>
          <p>
            Tout le reste est à taux plein (coupes nationales des grands pays,
            Europa, Conference, Ligue des nations). Coupe du monde des clubs :
            exclue.
          </p>
        </div>
      </Section>

      {/* Malus */}
      <Section titre="10. Malus de saison en club">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
            <span className="text-lg font-bold text-red-400">−50</span>
            <span className="text-sm text-white/60">points</span>
          </div>
          <p className="text-sm text-white/70">
            Retirés au total d&apos;un joueur dont le club termine{" "}
            <b className="text-red-400">au-delà de la 15ᵉ place</b> de son
            championnat. Le Ballon d&apos;Or récompense une saison entière : une
            saison de club ratée en fait partie.
          </p>
        </div>
      </Section>
    </div>
  );
}

function Section({
  titre,
  sous,
  children,
}: {
  titre: string;
  sous?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <h2 className="text-lg font-semibold">{titre}</h2>
      {sous && <p className="mb-4 mt-0.5 text-xs text-white/40">{sous}</p>}
      {!sous && <div className="mb-4" />}
      {children}
    </section>
  );
}

function Pastille({ valeur, texte }: { valeur: string; texte: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gold/20 bg-gold/5 px-3 py-2">
      <span className="text-lg font-bold text-gold">{valeur}</span>
      <span className="text-sm text-white/60">{texte}</span>
    </div>
  );
}

function Table({
  entetes,
  lignes,
}: {
  entetes: string[];
  lignes: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-white/40">
            {entetes.map((e, i) => (
              <th key={i} className={i === 0 ? "pb-2" : "pb-2 text-right"}>
                {e}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lignes.map((ligne, i) => (
            <tr key={i} className="border-t border-white/5">
              {ligne.map((cell, j) => (
                <td
                  key={j}
                  className={
                    j === 0
                      ? "py-2 text-white/70"
                      : "py-2 text-right font-medium text-white"
                  }
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SousTable({
  titre,
  data,
}: {
  titre: string;
  data: Record<string, (string | number)[]>;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-white/80">{titre}</h3>
      <Table
        entetes={["Compétition", ...PHASES]}
        lignes={Object.entries(data).map(([comp, vals]) => [
          comp,
          ...vals.map(String),
        ])}
      />
    </div>
  );
}
