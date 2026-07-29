// Modèle de données réel du projet Ballon d'Or.
// Le site consomme directement le fichier `src/data/bareme_events.json`,
// produit par le pipeline Python (voir dossier `pipeline/`).

/** Un joueur du vivier, tel qu'exporté par le barème. */
export interface Joueur {
  id: number;
  nom: string;
  club: string | null;
  team_id: number | null;
  minutes: number;
  total: number;
}

/**
 * Un événement marquant : [date ISO, id joueur, points, libellé].
 * C'est le format brut (tuple) du fichier de sortie.
 */
export type EvenementTuple = [string, number, number, string];

/** Version nommée d'un événement, plus pratique à manipuler. */
export interface Evenement {
  date: string;
  playerId: number;
  points: number;
  libelle: string;
  categorie: CategorieId;
}

/** Fichier de sortie complet du pipeline. */
export interface BaremeExport {
  saison: string;
  joueurs: Joueur[];
  evenements: EvenementTuple[];
}

export type CategorieId =
  | "but"
  | "passe"
  | "bonus_but"
  | "bonus_passe"
  | "motm"
  | "parcours"
  | "champion"
  | "coupe"
  | "defense"
  | "clean_sheet"
  | "titre_stat"
  | "distinction";

export interface Categorie {
  id: CategorieId;
  label: string;
  color: string;
}

/** Répartition des points d'un joueur par catégorie. */
export interface RepartitionCategorie {
  categorie: Categorie;
  points: number;
  count: number;
}

/** Joueur enrichi : rang, événements, répartition. */
export interface JoueurDetail extends Joueur {
  rank: number;
  evenements: Evenement[];
  repartition: RepartitionCategorie[];
}
