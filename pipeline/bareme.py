#!/usr/bin/env python3
"""
FotMob — calcul du bareme date (v3, aligne sur BAREME BALLON D'OR 2026).

Nouveautes de cette version, par rapport a la v2, dictees par le nouveau
bareme (bareme_ballondor_2026.txt) :

  - PASSE DECISIVE A 0,75 POINT (la v2 la comptait a 1). Voir ASSIST_PT.
  - BONUS DE PHASE FINALE DISTINCTS pour les buts et pour les passes :
    le bareme separe desormais la table « buts en phase finale »
    (section 4) de la table « passes en phase finale » (section 5), qui
    n'ont plus les memes valeurs. D'ou deux tables, BONUS_BUT et
    BONUS_PASSE, la ou la v2 partageait une seule table.
  - LIGUE CONFERENCE (UECL) ajoutee aux tables de bonus de phase finale.
  - PARCOURS ACTIVE POUR L'EUROPA LEAGUE ET LA CONFERENCE LEAGUE. La v2
    definissait deja leurs valeurs de parcours mais ne parcourait que la
    LDC et la CdM : les points de parcours UEL/UECL n'etaient jamais
    attribues. Le bareme 2026 les tabule explicitement (section 2), on
    les active donc.
  - REMPLACANTS EN PHASE FINALE (LDC/CdM) : est TITULAIRE le joueur
    titularise sur plus de 50 % des matchs de phase finale de son equipe
    (denominateur = tous les matchs KO de l'equipe) ; il garde alors le
    plein tarif. Sinon il est remplacant et prend 1/2 sur les points
    collectifs de la competition. Seuil et regime dans part_jouee()
    (STATUT_MODE = "forfait" par defaut = 1/2, conforme au bareme).
  - CUMUL DES BONUS DE TOUR : bonus de but (sec. 4), de passe (sec. 5) et
    trophee d'homme du match (sec. 6) s'ADDITIONNENT sur un meme match ;
    ils ne sont plus dedupliques (BONUS_UNE_FOIS_PAR_MATCH = False).
  - MLS ajoutee au regime reduit (production au 1/4, MLS Cup au 1/2).
    Sans effet tant que la MLS n'est pas dans la base : seule la Coupe du
    monde de Messi y figure, et elle compte a taux plein.
  - COUPE DU MONDE DES CLUBS : hors bareme. Elle n'est pas dans la liste
    blanche, donc deja absente de la base — rien a exclure activement.
  - ARRONDI : on n'arrondit PLUS chaque evenement a l'entier. Le 0,75
    d'une passe isolee serait remonte a 1 par round(). On garde donc les
    evenements en valeur reelle (2 decimales) et on n'arrondit qu'au
    total par joueur. explique.py affiche deja les points en decimales.

Heritage v2 conserve : vivier complet (tri final sur les points), titres
de champion calcules, coefficient hors top 5, vainqueurs aux tirs au but
declares a la main, rapprochement des noms insensible aux accents.

Usage (Windows) :
    py bareme.py --pool 60
    py bareme.py --sans-manuel

Sortie : bareme_events.json
"""

import json
import pathlib
import re
import sqlite3
import sys
import unicodedata
from collections import defaultdict

DB_PATH = pathlib.Path("fotmob.db")
MANUEL = pathlib.Path("bareme_manuel.json")
SORTIE = pathlib.Path("bareme_events.json")

LDC, CDM, UEL, UECL = 42, 77, 73, 10216
MLS = 130                             # non presente dans la base : voir docstring
TOP5 = {47, 87, 55, 54, 53}           # Angleterre, Espagne, Italie, Allemagne, France

NOM_COMP = {LDC: "LDC", CDM: "CdM", UEL: "UEL", UECL: "UECL"}
# Competitions donnant des points de parcours (section 2 du bareme).
PARCOURS_COMPS = (LDC, CDM, UEL, UECL)

# Passe decisive : 0,75 point (bareme 2026, section 1). Le but reste a 1.
ASSIST_PT = 0.75

# Le coefficient ne vise QUE les championnats hors top 5, pas les coupes
# europeennes ni les coupes nationales des grands pays. La MLS releve du
# meme regime reduit que les championnats hors des cinq grands (1/4).
CHAMPIONNATS_QUART = {
    61,      # Liga Portugal
    57,      # Eredivisie
    71,      # Super Lig
    MLS,     # MLS (Major League Soccer) — cas Messi, hors base pour l'instant
}
COUPES_DEMI = {
    186,     # Taca de Portugal
    149,     # Coupe de Belgique
    # NB : la MLS Cup (playoffs) doit compter au 1/2. FotMob la range sous
    # l'id 130 comme tours a elimination directe du meme championnat : si
    # tu ingres la MLS un jour, il faudra la traiter a la main, aucun id
    # distinct ne l'isole du regulier.
}
# Toute competition non listee ci-dessus est a taux plein : c'est la
# lecture litterale de « 1 point par but, toutes competitions ».

# Finales gagnees aux tirs au but : la base affiche un nul, il faut
# declarer le vainqueur. team_id FotMob. Les finales d'Europa League et de
# Conference League 2026 se sont decidees dans le jeu (Aston Villa 3-0,
# Crystal Palace 1-0), elles n'ont pas besoin d'entree ici.
VAINQUEURS_TAB = {
    LDC: 9847,                        # PSG bat Arsenal 4-3 t.a.b, 30 mai 2026
}

# --- Section 4 du bareme : BUTS en phase finale --------------------------
BONUS_BUT = {
    # Les seiziemes de C1 sont nommes « barrages » par l'UEFA : les deux
    # libelles sont barems a l'identique.
    LDC:  {"Barrages": 2, "Seiziemes de finale": 2, "Huitiemes de finale": 4,
           "Quarts de finale": 7, "Demi-finales": 13, "Finale": 25},
    CDM:  {"Seiziemes de finale": 3, "Huitiemes de finale": 5,
           "Quarts de finale": 9, "Demi-finales": 18,
           "Match 3e place": 10, "Finale": 35},
    UEL:  {"Barrages": 1, "Seiziemes de finale": 1, "Huitiemes de finale": 2,
           "Quarts de finale": 3, "Demi-finales": 5, "Finale": 10},
    UECL: {"Barrages": 1, "Seiziemes de finale": 1, "Huitiemes de finale": 1,
           "Quarts de finale": 2, "Demi-finales": 3, "Finale": 5},
}

# --- Section 5 du bareme : PASSES DECISIVES en phase finale ---------------
BONUS_PASSE = {
    LDC:  {"Barrages": 2, "Seiziemes de finale": 2, "Huitiemes de finale": 3,
           "Quarts de finale": 5, "Demi-finales": 10, "Finale": 20},
    CDM:  {"Seiziemes de finale": 2, "Huitiemes de finale": 4,
           "Quarts de finale": 8, "Demi-finales": 15,
           "Match 3e place": 5, "Finale": 30},
    UEL:  {"Barrages": 1, "Seiziemes de finale": 1, "Huitiemes de finale": 1,
           "Quarts de finale": 2, "Demi-finales": 4, "Finale": 8},
    UECL: {"Barrages": 1, "Seiziemes de finale": 1, "Huitiemes de finale": 1,
           "Quarts de finale": 2, "Demi-finales": 3, "Finale": 5},
}

# --- Section 6 du bareme : HOMMES DU MATCH en phase finale ----------------
# Utilise uniquement si MOTM_AUTOMATIQUE = True. Par defaut les hommes du
# match des tours a elimination directe sont saisis dans le fichier manuel
# (l'algo FotMob designe le mieux note, pas le laureat officiel).
BONUS_MOTM = {
    LDC:  {"Barrages": 2, "Seiziemes de finale": 2, "Huitiemes de finale": 4,
           "Quarts de finale": 8, "Demi-finales": 15, "Finale": 30},
    CDM:  {"Seiziemes de finale": 3, "Huitiemes de finale": 5,
           "Quarts de finale": 10, "Demi-finales": 20,
           "Match 3e place": 10, "Finale": 40},
    UEL:  {"Barrages": 1, "Seiziemes de finale": 1, "Huitiemes de finale": 2,
           "Quarts de finale": 3, "Demi-finales": 5, "Finale": 10},
    UECL: {"Barrages": 1, "Seiziemes de finale": 1, "Huitiemes de finale": 1,
           "Quarts de finale": 2, "Demi-finales": 3, "Finale": 5},
}

# --- Section 4 bis : CLEAN SHEET en phase finale -------------------------
# Si l'equipe encaisse 0 but, les TITULAIRES en defense et le gardien
# prennent ces points. Titulaire = position_id renseigne ; defense et
# gardien = position_id < 40 (grille FotMob : 11 = gardien, 3x = ligne
# defensive, 6x et au-dela = milieux et attaquants).
BONUS_CLEANSHEET = {
    LDC:  {"Barrages": 1, "Seiziemes de finale": 1, "Huitiemes de finale": 2,
           "Quarts de finale": 4, "Demi-finales": 8, "Finale": 15},
    CDM:  {"Seiziemes de finale": 2, "Huitiemes de finale": 3,
           "Quarts de finale": 5, "Demi-finales": 10,
           "Match 3e place": 5, "Finale": 20},
    UEL:  {"Barrages": 1, "Seiziemes de finale": 1, "Huitiemes de finale": 2,
           "Quarts de finale": 3, "Demi-finales": 5, "Finale": 10},
    UECL: {"Barrages": 1, "Seiziemes de finale": 1, "Huitiemes de finale": 1,
           "Quarts de finale": 2, "Demi-finales": 3, "Finale": 5},
}

# Poste : gardien + defenseurs (voir grille ci-dessus).
POSTE_DEFENSIF_MAX = 40

# --- Section 8 : MEILLEURE DEFENSE de la competition ---------------------
# Meme valeur que les titres de buteur/passeur, versee a la defense et au
# gardien titulaires de l'equipe ayant le moins encaisse.
# Section 8 : le bareme distingue desormais trois colonnes.
#                     Buteur   Passeur   Defense
#   Championnat          10        8         6
#   Ligue des champions  20       16        12
#   Coupe du monde       30       24        18
# (les lignes LDC et CdM de buteur/passeur sont saisies dans le fichier
#  manuel ; seule la colonne Championnat est calculee automatiquement.)
TITRE_BUTEUR_CHAMPIONNAT = 10
TITRE_PASSEUR_CHAMPIONNAT = 8

TITRE_DEFENSE_CHAMPIONNAT = 6
TITRE_DEFENSE_LDC = 12
TITRE_DEFENSE_CDM = 18
# Seuil de titularisation pour toucher le titre de meilleure defense :
# avoir demarre plus de cette fraction des matchs de l'equipe.
SEUIL_TITULAIRE_DEFENSE = 0.5

PARCOURS = {
    LDC:  {"Finale_vainqueur": 40, "Finale": 20, "Demi-finales": 10, "Quarts de finale": 5},
    CDM:  {"Finale_vainqueur": 50, "Finale": 25, "Demi-finales": 13, "Quarts de finale": 7},
    UEL:  {"Finale_vainqueur": 30, "Finale": 15, "Demi-finales": 8, "Quarts de finale": 4},
    UECL: {"Finale_vainqueur": 20, "Finale": 10, "Demi-finales": 5, "Quarts de finale": 3},
}

# Le champ playerOfTheMatch de FotMob designe le joueur le MIEUX NOTE par
# leur algorithme, pas le laureat officiel : sur la finale 2026 il donne
# Raya la ou l'UEFA a designe Vitinha. Les distinctions officielles des
# tours a elimination directe sont donc saisies dans bareme_manuel.json,
# et le calcul automatique reste desactive pour eviter le doublon.
MOTM_AUTOMATIQUE = False

# --- Corrections d'objectivite -------------------------------------------
# 1. Cumul des bonus de tour : un buteur elu homme du match d'un tour
#    couperet touche A LA FOIS le bonus de but (section 4) ET le trophee
#    d'homme du match (section 6) — ce sont deux recompenses distinctes du
#    bareme, elles s'additionnent. (La v3 gardait a tort le seul plus eleve
#    des deux ; desactive ici a la demande.)
BONUS_UNE_FOIS_PAR_MATCH = False
# 2. Regime remplacant : un remplacant en phase finale de LDC/CdM prend
#    1/2 sur TOUS ses points de la competition (production, bonus de tour,
#    homme du match, distinctions, parcours), et non plus seulement sur le
#    collectif. Voir reduc() et la fonction part_jouee().
PRORATA_COLLECTIF = True
# 3. Les distinctions ne sont PLUS divisees par deux : le ×0,5 sur les votes
#    (MVP, equipe-type, meilleur joueur) a ete retire a la demande. La
#    constante reste a 1.0 pour reactiver facilement au besoin.
COEF_DISTINCTIONS = 1.0

# Regime des REMPLACANTS en phase finale de LDC/CdM (bareme 2026, sec. 9 :
# « proratisation au nombre reel de matchs joues »). Un remplacant entre a
# CHAQUE tour aurait, en presence brute, un prorata de 1,0 : la clause ne
# mordrait pas (cas Ferran Torres, entre aux 5 matchs couperet de la CdM,
# 143 min au total). On lit donc « matchs reellement joues » comme le
# VOLUME DE JEU :
#   "minutes"  -> minutes en phase finale / (matchs KO de l'equipe * 90)
#                 143 min sur 5 tours -> 0,32 ; c'est le mode par defaut.
#   "forfait"  -> demi-tarif fixe (comportement v2), voir STATUT_REMPLACANT.
#   "presence" -> matchs joues / matchs KO de l'equipe (lecture litterale
#                 « presence », remplacant omnipresent = plein tarif).
# Un TITULAIRE (renseigne comme tel sur plus de 50 % de ses matchs KO)
# reste toujours a plein tarif, quel que soit le mode.
STATUT_MODE = "forfait"
STATUT_REMPLACANT = 0.5           # utilise seulement si STATUT_MODE == "forfait"

# Etendre le regime remplacant a TOUTES les competitions, et pas seulement
# a la LDC et a la Coupe du monde comme l'ecrit la section 9.
#   False -> lecture litterale du bareme : seules LDC et CdM sont reduites.
#            Un remplacant du champion touche alors ses 25 points de titre
#            en entier, exactement comme un titulaire.
#   True  -> le meme seuil (avoir demarre plus de la moitie des matchs de
#            son equipe dans la competition) vaut partout : championnat,
#            coupes nationales, Europa, Conference. Un joueur de rotation
#            prend 1/2 sur les points de cette competition, titre collectif
#            compris.
# Pour LDC et CdM le denominateur reste les matchs de PHASE FINALE ; pour
# les autres competitions, c'est l'ensemble des matchs de l'equipe.
REMPLACANT_TOUTES_COMPETITIONS = True

# Deux garde-fous, sans lesquels le seuil a 50 % produit des aberrations.
#
# 1. ECHANTILLON MINIMAL. Sur une competition ou l'equipe n'a joue que deux
#    ou trois matchs (elimination precoce en coupe), un match d'ecart fait
#    basculer le statut. En dessous de ce nombre de matchs, aucune reduction
#    n'est appliquee : l'echantillon ne veut rien dire.
# Ne s'applique QU'AUX competitions ajoutees par l'extension : en LDC et
# en CdM la regle du bareme prime, meme sur 4 matchs de phase finale.
MIN_MATCHS_STATUT = 5
#
# 2. LES ENTREES COMPTENT. Ne regarder que les titularisations traite un
#    joueur entre a chaque match comme un absent. Une entree en jeu vaut
#    donc POIDS_ENTREE titularisation dans le calcul du statut.
#    A 0.0 on retrouve le comptage strict des seules titularisations.
# Comme ci-dessus : ne vaut QUE pour les competitions ajoutees par
# l'extension. En LDC et en CdM la section 9 dit « titulaire dans plus de
# 50 % des matchs » — seules les TITULARISATIONS comptent, pas les entrees.
POIDS_ENTREE = 0.5

# 3. TITULAIRE EN HAUT LIEU = TITULAIRE PARTOUT. Un joueur titulaire de la
#    campagne dans l'une de ces competitions echappe a la reduction dans
#    TOUTES les autres. La rotation en championnat sert justement a le
#    preserver pour ces rendez-vous : le penaliser serait un contresens.
#    Mettre () pour desactiver.
COMPETITIONS_REFERENCE = (LDC, CDM)

# --- Cas Messi : production et recompenses MLS saisies a la main ---------
# La MLS n'est pas dans fotmob.db : seule la Coupe du monde de Messi y
# figure (id 30981, calculee a taux plein comme toute selection). La MLS
# etant un championnat hors des cinq grands, sa production et ses
# distinctions comptent au 1/4 et la MLS Cup au 1/2 (bareme 2026, sec. 9).
# Renseigne ici les chiffres de ta saison ; le code applique les
# coefficients, tu n'entres que des valeurs BRUTES. A 0 / False, rien n'est
# ajoute. Sa production en selection argentine reste, elle, dans la base.
MESSI_ID = 30981
MESSI_MLS = {
    "date":            "2026-06-13",   # date d'attribution (cloture MLS)
    "buts":            35,             # buts en MLS            -> x1     x1/4
    "passes":          24,             # passes decisives MLS  -> x0,75  x1/4
    "meilleur_joueur": True,           # MVP MLS (15)          -> x1/4   x1/2 (vote)
    "titre_buteur":    True,           # Golden Boot MLS (10)  -> x1/4
    "titre_passeur":   True,           # meilleur passeur (10) -> x1/4
    "mls_cup":         True,           # Inter Miami vainqueur -> MLS_CUP_BASE x1/2
}
# Valeur de base du titre remporte en MLS, AVANT le coefficient 1/2. La MLS
# Cup est le titre de champion, decide en playoffs : 25 par defaut. Mets 10
# si tu preferes la traiter comme une simple coupe nationale.
MLS_CUP_BASE = 25

TITRE_CHAMPION = 25
TITRE_COUPE_NATIONALE = 10
TITRE_SUPERCOUPE = 5

# Championnats nationaux : SEULES competitions donnant un titre de champion
# (sec. 3) et des titres de meilleur buteur/passeur automatiques (sec. 8).
# Liste blanche indispensable : les tours de coupe numerotes (DFB Pokal « 2 »)
# et les phases de ligue europeennes (Europa/Conference, journees « 1 »..« 8 »)
# sont classes « Phase reguliere » par classer_phase(). Sans ce filtre, le
# script sacrait un « champion DFB Pokal » des octobre et un « champion
# Europa League » fin janvier, au meilleur bilan de ces phases.
CHAMPIONNATS = {
    47,   # Premier League
    87,   # LaLiga
    55,   # Serie A
    54,   # Bundesliga
    53,   # Ligue 1
    57,   # Eredivisie
    61,   # Liga Portugal
    71,   # Super Lig
    MLS,  # MLS (hors base)
}

COUPES_NATIONALES = {
    132,   # FA Cup
    133,   # EFL Cup
    138,   # Copa del Rey
    141,   # Coppa Italia
    209,   # DFB Pokal
    134,   # Coupe de France
    186,   # Taca de Portugal      (coefficient 1/2)
    149,   # Coupe de Belgique     (coefficient 1/2)
}
SUPERCOUPES = {
    139,   # Supercopa de Espana
    222,   # Supercoppa Italiana
    207,   # Trophee des champions
    74,    # Supercoupe de l'UEFA
}

# Finales de coupe nulles au temps reglementaire : declarer le vainqueur
# ici, la base ne connait pas le score des tirs au but. Le nom suffit, il
# est rapproche des deux equipes de la finale (accents et casse ignores).
VAINQUEURS_COUPES = {
    138: "Real Sociedad",            # Copa del Rey
    207: "Paris Saint-Germain",      # Trophee des champions
}
ORDRE = ["Phase reguliere", "Phase de groupes", "Barrages",
         "Seiziemes de finale", "Huitiemes de finale", "Quarts de finale",
         "Demi-finales", "Finale"]


def normaliser(txt: str) -> str:
    d = unicodedata.normalize("NFKD", str(txt).lower())
    return re.sub(r"[^a-z ]", "", "".join(c for c in d if not unicodedata.combining(c)))


def classer_phase(v) -> str:
    if v is None:
        return "Phase reguliere"
    v = str(v).strip().lower()
    if not v or re.fullmatch(r"\d+", v):
        return "Phase reguliere"
    if "1/16" in v or "round of 32" in v:
        return "Seiziemes de finale"
    if "1/8" in v or "round of 16" in v:
        return "Huitiemes de finale"
    if "quarter" in v or "1/4" in v:
        return "Quarts de finale"
    if "semi" in v or "1/2" in v:
        return "Demi-finales"
    if any(t in v for t in ("3rd", "third", "bronze")):
        return "Match 3e place"
    if "final" in v:
        return "Finale"
    if "group" in v or "grp" in v:
        return "Phase de groupes"
    if "play" in v:
        return "Barrages"
    return "Phase reguliere"


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit("fotmob.db introuvable.")
    conn = sqlite3.connect(DB_PATH)
    try:
        conn.execute("SELECT 1 FROM v_stat LIMIT 1")
    except sqlite3.OperationalError:
        raise SystemExit("v_stat absente. Lance : py finalize.py --appliquer")

    pool_n = 60
    if "--pool" in sys.argv:
        pool_n = int(sys.argv[sys.argv.index("--pool") + 1])

    print("Lecture des matchs...")
    matchs = {}
    for mid, date, parent, rnd in conn.execute(
            "SELECT match_id, date_utc, parent_league_id, round FROM v_match"):
        matchs[mid] = {"date": (date or "")[:10], "parent": parent,
                       "phase": classer_phase(rnd)}

    def coef(parent):
        if parent in CHAMPIONNATS_QUART:
            return 0.25
        if parent in COUPES_DEMI:
            return 0.5
        return 1.0

    # --- Statut titulaire / remplacant en phase finale (LDC/CdM) ---------
    # Calcule AVANT la production : le regime reduit remplacant (bareme 2026
    # sec. 9) s'applique a TOUS les points generes dans LDC/CdM — production,
    # bonus de tour, homme du match, distinctions, parcours — pas seulement
    # au collectif. position_id renseigne = titulaire, nul = entrant. Un
    # joueur est titulaire s'il a DEMARRE plus de 50 % des matchs de phase
    # finale de son equipe ; sinon remplacant -> reduction (1/2 par defaut).
    PHASES_FINALES = {"Seiziemes de finale", "Barrages", "Huitiemes de finale",
                      "Quarts de finale", "Demi-finales", "Match 3e place", "Finale"}
    titu = defaultdict(int)
    remp = defaultdict(int)
    matchs_ko_equipe = defaultdict(set)       # (parent, tid) -> {match_id}
    min_ko = defaultdict(float)               # (pid, parent) -> minutes KO
    freq_equipe = defaultdict(lambda: defaultdict(int))   # (pid,parent)->tid->n
    titu_all = defaultdict(int)               # (pid, parent) -> titularisations
    remp_all = defaultdict(int)
    matchs_equipe = defaultdict(set)          # (parent, tid) -> {match_id}
    min_all = defaultdict(float)
    for mid, m in matchs.items():
        # --- comptage generalise : toutes competitions, tous matchs ---
        for pid_, tid_, pos in conn.execute(
                "SELECT player_id, team_id, position_id FROM appearance "
                "WHERE match_id = ?", (mid,)):
            freq_equipe[(pid_, m["parent"])][tid_] += 1
            if pos is not None:
                titu_all[(pid_, m["parent"])] += 1
            else:
                remp_all[(pid_, m["parent"])] += 1
            matchs_equipe[(m["parent"], tid_)].add(mid)
        if m["parent"] not in (LDC, CDM):
            continue
        ko = m["phase"] in PHASES_FINALES
        for pid_, tid_, pos in conn.execute(
                "SELECT player_id, team_id, position_id FROM appearance "
                "WHERE match_id = ?", (mid,)):
            if ko:
                if pos is not None:
                    titu[(pid_, m["parent"])] += 1
                else:
                    remp[(pid_, m["parent"])] += 1
        if ko:
            for tid_, in conn.execute(
                    "SELECT DISTINCT team_id FROM appearance WHERE match_id = ?", (mid,)):
                matchs_ko_equipe[(m["parent"], tid_)].add(mid)
    for pid_, mid, val in conn.execute(
            "SELECT player_id, match_id, value FROM v_stat "
            "WHERE stat_key = 'minutes_played' AND value > 0"):
        m = matchs.get(mid)
        if m:
            min_all[(pid_, m["parent"])] += val
            if m["parent"] in (LDC, CDM) and m["phase"] in PHASES_FINALES:
                min_ko[(pid_, m["parent"])] += val
    # Equipe principale du joueur dans chaque competition : denominateur du
    # statut = nombre de matchs de phase finale de SON equipe.
    equipe_comp = {c: max(v, key=v.get) for c, v in freq_equipe.items()}

    def _compte(pid, parent):
        """(matchs de l'equipe, titularisations, matchs joues, minutes).

        Pour LDC et CdM on ne regarde que la PHASE FINALE, comme l'ecrit la
        section 9 ; pour les autres competitions, tous les matchs.
        """
        tid = equipe_comp.get((pid, parent))
        if tid is None:
            return None
        if parent in (LDC, CDM):
            total = len(matchs_ko_equipe.get((parent, tid), ()))
            n_titu = titu.get((pid, parent), 0)
            n_joue = n_titu + remp.get((pid, parent), 0)
            minutes = min_ko.get((pid, parent), 0.0)
        else:
            total = len(matchs_equipe.get((parent, tid), ()))
            n_titu = titu_all.get((pid, parent), 0)
            n_joue = n_titu + remp_all.get((pid, parent), 0)
            minutes = min_all.get((pid, parent), 0.0)
        return total, n_titu, n_joue, minutes

    def est_titulaire(pid, parent):
        """True si titulaire de la campagne, None s'il n'a pas dispute la
        competition. Un echantillon trop faible vaut titulaire."""
        d = _compte(pid, parent)
        if d is None:
            return None
        total, n_titu, n_joue, _ = d
        if total == 0:
            return True
        if parent not in (LDC, CDM) and total < MIN_MATCHS_STATUT:
            return True                       # echantillon trop faible
        poids = (n_titu if parent in (LDC, CDM)
                 else n_titu + POIDS_ENTREE * (n_joue - n_titu))
        return poids / total > 0.5

    def reduc(pid, parent):
        """Coefficient remplacant applique a tous les points de la competition."""
        if not PRORATA_COLLECTIF:
            return 1.0
        ko_based = parent in (LDC, CDM)
        if not ko_based and not REMPLACANT_TOUTES_COMPETITIONS:
            return 1.0
        # Titulaire dans une competition de reference -> titulaire partout.
        # Un joueur titularise en Ligue des champions n'est pas un remplacant :
        # s'il est menage en championnat, c'est precisement pour la C1.
        if not ko_based:
            for ref in COMPETITIONS_REFERENCE:
                if est_titulaire(pid, ref) is True:
                    return 1.0
        d = _compte(pid, parent)
        if d is None:
            return 1.0
        total, n_titu, n_joue, minutes = d
        if total == 0:
            return 1.0
        # L'echantillon minimal ne vaut QUE pour les competitions ajoutees
        # par l'extension. En LDC et en CdM la section 9 impose la regle
        # explicitement : une phase finale de Coupe du monde ne compte que
        # 4 ou 5 matchs, un seuil generique l'annulerait entierement.
        if not ko_based and total < MIN_MATCHS_STATUT:
            return 1.0                        # echantillon trop faible
        # En LDC/CdM : lettre du bareme, seules les titularisations comptent.
        poids = n_titu if ko_based else n_titu + POIDS_ENTREE * (n_joue - n_titu)
        if poids / total > 0.5:
            return 1.0                        # titulaire de la campagne
        if STATUT_MODE == "forfait":
            return STATUT_REMPLACANT          # 1/2 : regle du bareme
        if STATUT_MODE == "presence":
            return min(1.0, n_joue / total)
        return min(1.0, minutes / (total * 90))

    def part_jouee(pid, parent, tid):
        # Alias pour les points collectifs (parcours/champion/coupe) : meme
        # coefficient que la production, derive de l'equipe du joueur.
        return reduc(pid, parent)

    # ---------------------------------------------------------- production
    print("Production, sur le vivier complet...")
    evenements = []
    noms, clubs, equipes = {}, {}, {}
    minutes = defaultdict(float)
    # Le club retenu doit etre le club, jamais la selection : sinon les
    # barres des joueurs dont le Mondial clot la saison prendraient les
    # couleurs de l'Espagne ou de l'Argentine. On compte les apparitions
    # hors Coupe du monde et on garde la plus frequente.
    freq_club = defaultdict(lambda: defaultdict(int))

    for pid, nom, mid, cle, val, team, team_nom in conn.execute("""
            SELECT player_id, player_name, match_id, stat_key, value,
                   team_id, team_name
            FROM v_stat
            WHERE stat_key IN ('goals','assists','minutes_played') AND value > 0"""):
        m = matchs.get(mid)
        if not m:
            continue
        noms[pid] = nom
        if team and m["parent"] != CDM:
            freq_club[pid][(team, team_nom)] += 1
        if cle == "minutes_played":
            minutes[pid] += val
            continue

        k = coef(m["parent"])
        n = int(val)
        comp = NOM_COMP.get(m["parent"])
        rd = reduc(pid, m["parent"])          # 1/2 si remplacant LDC/CdM
        if cle == "goals":
            # 1 point par but, au coefficient de la competition.
            evenements.append((m["date"], pid, n * 1.0 * k * rd, f"{n} but(s)"))
            bonus = BONUS_BUT.get(m["parent"], {}).get(m["phase"], 0)
            if bonus:
                evenements.append((m["date"], pid, float(bonus * n) * rd,
                                   f"but decisif {comp} {m['phase']}"))
        else:  # assists
            # 0,75 point par passe decisive, au coefficient de la competition.
            evenements.append((m["date"], pid, n * ASSIST_PT * k * rd, f"{n} passe(s)"))
            bonus = BONUS_PASSE.get(m["parent"], {}).get(m["phase"], 0)
            if bonus:
                evenements.append((m["date"], pid, float(bonus * n) * rd,
                                   f"passe decisive {comp} {m['phase']}"))

    for pid, compte in freq_club.items():
        (tid, tnom), _ = max(compte.items(), key=lambda kv: kv[1])
        equipes[pid], clubs[pid] = tid, tnom

    # -------------------------------------------------- clean sheets KO
    print("Clean sheets en phase finale...")
    n_cs = 0
    for mid, m in matchs.items():
        table = BONUS_CLEANSHEET.get(m["parent"])
        if not table:
            continue
        pts = table.get(m["phase"], 0)
        if not pts:
            continue
        row = conn.execute("""SELECT home_team_id, away_team_id,
                                     home_score, away_score
                              FROM match WHERE match_id = ?""", (mid,)).fetchone()
        if not row:
            continue
        h, a, hs, aws = row
        if hs is None or aws is None:
            continue
        # Une equipe fait un clean sheet si elle n'encaisse rien : c'est le
        # score de l'ADVERSAIRE qui doit valoir zero.
        for tid, encaisse in ((h, aws), (a, hs)):
            if encaisse != 0:
                continue
            comp = NOM_COMP.get(m["parent"], str(m["parent"]))
            for pid_, in conn.execute(
                    """SELECT player_id FROM appearance
                       WHERE match_id = ? AND team_id = ?
                         AND position_id IS NOT NULL AND position_id < ?""",
                    (mid, tid, POSTE_DEFENSIF_MAX)):
                if pid_ in noms:
                    evenements.append((m["date"], pid_,
                                       pts * reduc(pid_, m["parent"]),
                                       f"clean sheet {comp} {m['phase']}"))
                    n_cs += 1
    print(f"  {n_cs} recompense(s) de clean sheet attribuee(s)")

    # ------------------------------------------------------------ parcours
    print("Parcours en LDC, Coupe du monde, Europa League et Conference League...")
    atteint = defaultdict(lambda: {"rang": -1, "phase": None, "date": None})
    vainqueurs = {}
    for mid, m in matchs.items():
        if m["parent"] not in PARCOURS_COMPS:
            continue
        rang = ORDRE.index(m["phase"]) if m["phase"] in ORDRE else -1
        for tid, in conn.execute(
                "SELECT DISTINCT team_id FROM appearance WHERE match_id = ?", (mid,)):
            c = (m["parent"], tid)
            if rang > atteint[c]["rang"]:
                atteint[c] = {"rang": rang, "phase": m["phase"], "date": m["date"]}

        # Vainqueur de la finale : par le score, avec la table des tirs au
        # but en derogation. La base n'enregistre que le temps reglementaire,
        # donc un nul en finale ne designe personne sans cette table.
        if m["phase"] == "Finale":
            if m["parent"] in VAINQUEURS_TAB:
                vainqueurs[m["parent"]] = VAINQUEURS_TAB[m["parent"]]
            else:
                row = conn.execute("""SELECT home_team_id, away_team_id,
                                             home_score, away_score
                                      FROM match WHERE match_id = ?""",
                                   (mid,)).fetchone()
                if row:
                    h, a, hs, aws = row
                    if (hs or 0) > (aws or 0):
                        vainqueurs[m["parent"]] = h
                    elif (aws or 0) > (hs or 0):
                        vainqueurs[m["parent"]] = a

    for parent in PARCOURS_COMPS:
        nom = NOM_COMP.get(parent, str(parent))
        v = vainqueurs.get(parent)
        print(f"  vainqueur {nom} : "
              f"{'equipe ' + str(v) if v else 'INDETERMINE — a declarer dans VAINQUEURS_TAB'}")

    for (parent, tid), info in atteint.items():
        bareme = PARCOURS.get(parent, {})
        if info["phase"] == "Finale":
            cle = "Finale_vainqueur" if vainqueurs.get(parent) == tid else "Finale"
        elif info["phase"] in bareme:
            cle = info["phase"]
        else:
            continue
        pts = bareme.get(cle, 0)
        if not pts:
            continue
        comp = NOM_COMP.get(parent, str(parent))
        for pid, in conn.execute("""
                SELECT DISTINCT a.player_id FROM appearance a
                JOIN match m ON m.match_id = a.match_id
                WHERE a.team_id = ? AND m.parent_league_id = ? AND m.usable = 1""",
                (tid, parent)):
            if pid in noms:
                evenements.append((info["date"], pid,
                                   pts * part_jouee(pid, parent, tid),
                                   f"parcours {comp} {cle.replace('_', ' ')}"))

    # ------------------------------------------------------------ champions
    print("Titres de champion...")
    pts_equipe = defaultdict(lambda: defaultdict(float))
    derniere = defaultdict(dict)
    for mid, h, a, hs, aws in conn.execute("""
            SELECT match_id, home_team_id, away_team_id, home_score, away_score
            FROM v_match"""):
        m = matchs.get(mid)
        if not m or m["phase"] != "Phase reguliere" or hs is None or aws is None:
            continue
        p = m["parent"]
        if hs > aws:
            pts_equipe[p][h] += 3
        elif aws > hs:
            pts_equipe[p][a] += 3
        else:
            pts_equipe[p][h] += 1
            pts_equipe[p][a] += 1
        for t in (h, a):
            derniere[p][t] = max(derniere[p].get(t, ""), m["date"])

    for parent, classement in pts_equipe.items():
        if parent not in CHAMPIONNATS or not classement:
            continue
        champion = max(classement, key=classement.get)
        pts = TITRE_CHAMPION * coef(parent)
        nom_comp = conn.execute(
            "SELECT competition FROM v_match WHERE parent_league_id = ? LIMIT 1",
            (parent,)).fetchone()
        for pid, in conn.execute("""
                SELECT DISTINCT a.player_id FROM appearance a
                JOIN match m ON m.match_id = a.match_id
                WHERE a.team_id = ? AND m.parent_league_id = ? AND m.usable = 1""",
                (champion, parent)):
            if pid in noms:
                evenements.append((derniere[parent].get(champion, "2026-05-31"),
                                   pid, pts * part_jouee(pid, parent, champion),
                                   f"champion {nom_comp[0] if nom_comp else parent}"))

    # ------------------------------------------- titres de buteur/passeur
    print("Titres de meilleur buteur et passeur des championnats...")
    # 10 points par titre de championnat, au coefficient de la competition.
    # Les titres de buteur/passeur de LDC (20) et de Coupe du monde (30) du
    # bareme 2026 restent dans le fichier manuel : ils portent sur des
    # competitions ou le decompte officiel fait foi.
    for parent in list(pts_equipe):
        if parent not in CHAMPIONNATS:
            continue
        nom_comp = conn.execute(
            "SELECT competition FROM v_match WHERE parent_league_id = ? LIMIT 1",
            (parent,)).fetchone()
        libelle_comp = nom_comp[0] if nom_comp else str(parent)
        for cle, mot, valeur in (("goals", "buteur", TITRE_BUTEUR_CHAMPIONNAT),
                                 ("assists", "passeur", TITRE_PASSEUR_CHAMPIONNAT)):
            lignes = conn.execute("""
                SELECT s.player_id, SUM(s.value) AS n
                FROM v_stat s JOIN match m ON m.match_id = s.match_id
                WHERE m.parent_league_id = ? AND m.usable = 1 AND s.stat_key = ?
                GROUP BY s.player_id ORDER BY n DESC LIMIT 1""",
                (parent, cle)).fetchall()
            if not lignes:
                continue
            pid, n = lignes[0]
            if pid not in noms or not n:
                continue
            evenements.append((derniere[parent].get(
                max(derniere[parent], key=derniere[parent].get), "2026-05-31"),
                pid, valeur * coef(parent),
                f"meilleur {mot} {libelle_comp} ({n:.0f})"))

    # ------------------------------------------------- meilleure defense
    print("Meilleures defenses (section 8)...")
    # Buts encaisses par equipe et par competition, sur tous les matchs.
    encaisses = defaultdict(lambda: defaultdict(int))
    joues_comp = defaultdict(lambda: defaultdict(int))
    for mid, m in matchs.items():
        row = conn.execute("""SELECT home_team_id, away_team_id,
                                     home_score, away_score
                              FROM match WHERE match_id = ?""", (mid,)).fetchone()
        if not row:
            continue
        h, a, hs, aws = row
        if hs is None or aws is None:
            continue
        encaisses[m["parent"]][h] += aws
        encaisses[m["parent"]][a] += hs
        joues_comp[m["parent"]][h] += 1
        joues_comp[m["parent"]][a] += 1

    for parent, tab in encaisses.items():
        if parent in CHAMPIONNATS:
            valeur = TITRE_DEFENSE_CHAMPIONNAT * coef(parent)
        elif parent == LDC:
            valeur = TITRE_DEFENSE_LDC
        elif parent == CDM:
            valeur = TITRE_DEFENSE_CDM
        else:
            continue                      # coupes : pas de titre de defense
        # On ne compare que des equipes ayant joue un volume comparable :
        # sinon une equipe eliminee tot "encaisse peu" mecaniquement.
        vmax = max(joues_comp[parent].values()) if joues_comp[parent] else 0
        cands = {t: g for t, g in tab.items()
                 if joues_comp[parent][t] >= 0.8 * vmax}
        if not cands:
            continue
        best = min(cands, key=lambda t: cands[t])
        nom_comp = conn.execute(
            "SELECT competition FROM v_match WHERE parent_league_id = ? LIMIT 1",
            (parent,)).fetchone()
        libelle = nom_comp[0] if nom_comp else str(parent)
        # Titulaires defensifs : ont demarre plus de la moitie des matchs
        # de leur equipe dans cette competition, au poste gardien/defense.
        starts = defaultdict(int)
        for mid, m in matchs.items():
            if m["parent"] != parent:
                continue
            for pid_, in conn.execute(
                    """SELECT player_id FROM appearance
                       WHERE match_id = ? AND team_id = ?
                         AND position_id IS NOT NULL AND position_id < ?""",
                    (mid, best, POSTE_DEFENSIF_MAX)):
                starts[pid_] += 1
        seuil = SEUIL_TITULAIRE_DEFENSE * joues_comp[parent][best]
        date_fin = derniere.get(parent, {}).get(best, "2026-05-31")
        n_def = 0
        for pid_, nb in starts.items():
            if nb > seuil and pid_ in noms:
                evenements.append((date_fin, pid_,
                                   valeur * part_jouee(pid_, parent, best),
                                   f"meilleure defense {libelle} ({cands[best]} encaisses)"))
                n_def += 1
        if n_def:
            print(f"  {libelle} : {n_def} joueur(s), {cands[best]} buts encaisses")

    # ------------------------------------------------- coupes et supercoupes
    print("Coupes nationales et supercoupes...")
    for parent in sorted(COUPES_NATIONALES | SUPERCOUPES):
        rencontres = [(mid, m) for mid, m in matchs.items() if m["parent"] == parent]
        if not rencontres:
            continue
        # La finale porte la phase 'Finale' ; a defaut — supercoupes a match
        # unique, ou tour non renseigne — on retient la derniere jouee.
        finales = [(mid, m) for mid, m in rencontres if m["phase"] == "Finale"]
        if not finales:
            finales = [max(rencontres, key=lambda r: r[1]["date"])]
        mid, m = finales[-1]

        nom_comp = conn.execute(
            "SELECT competition FROM v_match WHERE match_id = ?", (mid,)).fetchone()
        libelle = nom_comp[0] if nom_comp else str(parent)

        row = conn.execute("""SELECT home_team_id, away_team_id, home_score,
                                     away_score, home_team, away_team
                              FROM match WHERE match_id = ?""", (mid,)).fetchone()
        vainqueur = None
        declare = VAINQUEURS_COUPES.get(parent)
        if row:
            h, a, hs, aws, hn, an = row
            if declare:
                # Rapprochement souple : « Real Sociedad » doit retrouver
                # « Real Sociedad de Futbol » comme « Real Sociedad ».
                cible = normaliser(declare)
                for tid, tnom in ((h, hn), (a, an)):
                    if cible in normaliser(tnom or "") or normaliser(tnom or "") in cible:
                        vainqueur = tid
                        break
                if vainqueur is None:
                    print(f"  [!] {libelle} : « {declare} » ne correspond a "
                          f"aucun des deux finalistes ({hn} / {an})")
            elif (hs or 0) > (aws or 0):
                vainqueur = h
            elif (aws or 0) > (hs or 0):
                vainqueur = a
        if vainqueur is None:
            print(f"  [!] {libelle} : finale nulle, vainqueur INDETERMINE "
                  f"(match {mid}) — a declarer dans VAINQUEURS_COUPES")
            continue

        valeur = (TITRE_SUPERCOUPE if parent in SUPERCOUPES
                  else TITRE_COUPE_NATIONALE)
        pts = valeur * coef(parent)
        for pid, in conn.execute("""
                SELECT DISTINCT a.player_id FROM appearance a
                JOIN match m ON m.match_id = a.match_id
                WHERE a.team_id = ? AND m.parent_league_id = ? AND m.usable = 1""",
                (vainqueur, parent)):
            if pid in noms:
                evenements.append((m["date"], pid,
                                   pts * part_jouee(pid, parent, vainqueur),
                                   f"vainqueur {libelle}"))

    # ------------------------------------------------- hommes du match
    # Calque exactement sur un but : 1 point de base au coefficient de la
    # competition, plus le bonus du tour (table BONUS_MOTM) en phase finale.
    a_produit = set()
    for pid, mid, val in conn.execute("""
            SELECT player_id, match_id, value FROM v_stat
            WHERE stat_key IN ('goals','assists') AND value > 0"""):
        a_produit.add((pid, mid))

    print("Trophees d'homme du match...")
    n_motm = 0
    motms = []
    if not MOTM_AUTOMATIQUE:
        print("  calcul automatique desactive — les distinctions officielles")
        print("  des tours a elimination directe sont dans le fichier manuel")
    else:
        try:
            motms = conn.execute(
                "SELECT match_id, motm_player_id FROM v_match "
                "WHERE motm_player_id IS NOT NULL").fetchall()
        except sqlite3.OperationalError:
            print("  [!] colonne motm_player_id absente des vues.")
            print("      Relance : py ingest.py cache/matches/  puis  "
                  "py finalize.py --appliquer")

    for mid, pid in motms:
        m = matchs.get(mid)
        if not m or pid not in noms:
            continue
        k = coef(m["parent"])
        evenements.append((m["date"], pid, 1.0 * k, "homme du match"))
        bonus = BONUS_MOTM.get(m["parent"], {}).get(m["phase"], 0)
        if bonus:
            comp = NOM_COMP.get(m["parent"], str(m["parent"]))
            evenements.append((m["date"], pid, float(bonus),
                               f"homme du match {comp} {m['phase']}"))
        n_motm += 1
    print(f"  {n_motm} trophee(s) attribue(s)")

    # -------------------------------------------------------------- manuel
    manuels = set()
    if MANUEL.exists() and "--sans-manuel" not in sys.argv:
        data = json.loads(MANUEL.read_text(encoding="utf-8"))
        exact = {normaliser(n): pid for pid, n in noms.items()}
        famille = defaultdict(list)
        for pid, n in noms.items():
            toks = normaliser(n).split()
            if toks:
                famille[toks[-1]].append(pid)

        introuvables = []
        for ev in data.get("evenements", []):
            cible = normaliser(ev.get("joueur", ""))
            pid = ev.get("player_id") or exact.get(cible)
            if pid is None:                       # repli sur le nom de famille
                cands = famille.get(cible.split()[-1] if cible else "", [])
                if len(cands) == 1:
                    pid = cands[0]
                    print(f"  rapproche : {ev['joueur']} -> {noms[pid]}")
            if pid is None:
                introuvables.append(ev.get("joueur"))
                continue
            lib = ev.get("libelle", "manuel")
            pts = float(ev["points"])
            # Regime remplacant (bareme 2026, sec. 9) : les points manuels
            # rattaches a la LDC ou a la CdM (homme du match, distinctions,
            # titres buteur/passeur de ces competitions) sont, eux aussi,
            # divises par deux pour un remplacant. La competition est lue
            # dans le libelle.
            l = lib.lower()
            if "cdm" in l or "coupe du monde" in l:
                pts *= reduc(pid, CDM)
            elif "ldc" in l or "ligue des champions" in l:
                pts *= reduc(pid, LDC)
            evenements.append((ev["date"], pid, pts, lib))
            manuels.add(pid)
        if introuvables:
            print(f"\n  [!] Toujours introuvable(s) : {introuvables}")
            print("      Ces joueurs ne figurent pas du tout dans ta base :")
            print("      leur championnat n'est pas dans la liste blanche.\n")

    # ------------------------------------------------- cas Messi (MLS manuelle)
    # Injectee au regime hors top 5. Coefficients appliques ici, une seule
    # fois : ces libelles ne passent pas par le filtre distinctions du
    # fichier manuel ni par le filtre de bonus de tour.
    if MESSI_ID in noms:
        q = 0.25                       # championnat hors des cinq grands
        d = MESSI_MLS["date"]
        b, p = int(MESSI_MLS["buts"]), int(MESSI_MLS["passes"])
        ajout = []
        if b:
            ajout.append((d, MESSI_ID, b * 1.0 * q, f"{b} but(s) MLS"))
        if p:
            ajout.append((d, MESSI_ID, p * ASSIST_PT * q, f"{p} passe(s) MLS"))
        if MESSI_MLS["meilleur_joueur"]:
            ajout.append((d, MESSI_ID, 15 * q, "meilleur joueur MLS"))
        if MESSI_MLS["titre_buteur"]:
            ajout.append((d, MESSI_ID, 10 * q, "meilleur buteur MLS"))
        if MESSI_MLS["titre_passeur"]:
            ajout.append((d, MESSI_ID, 10 * q, "meilleur passeur MLS"))
        if MESSI_MLS["mls_cup"]:
            ajout.append((d, MESSI_ID, MLS_CUP_BASE * 0.5, "vainqueur MLS Cup"))
        if ajout:
            evenements.extend(ajout)
            manuels.add(MESSI_ID)
            print(f"  Messi : {len(ajout)} ligne(s) MLS ajoutee(s) "
                  f"({sum(v for _, _, v, _ in ajout):.2f} pts)")
    else:
        print(f"  [!] Messi (id {MESSI_ID}) absent du vivier : "
              f"production MLS non ajoutee (verifie l'id).")

    # -------------------------------------------------------------- vivier
    if BONUS_UNE_FOIS_PAR_MATCH:
        # On ne garde, pour chaque couple (joueur, journee), que le plus
        # eleve des bonus de tour. Le point de base de chaque action reste
        # acquis : seule la prime de phase cesse d'etre cumulee. Le motif
        # couvre les trois canaux (but, passe, homme du match) sur les
        # quatre competitions a phase finale.
        import re as _re
        motif = _re.compile(
            r"(but decisif|passe decisive|homme du match) (LDC|CdM|UEL|UECL)")
        meilleur = defaultdict(float)
        for d_, pid, v, lib in evenements:
            if motif.search(lib):
                meilleur[(pid, d_)] = max(meilleur[(pid, d_)], v)
        filtre, vus = [], set()
        n_retires = 0
        for d_, pid, v, lib in evenements:
            if motif.search(lib):
                if (pid, d_) in vus:
                    n_retires += 1
                    continue
                vus.add((pid, d_))
                filtre.append((d_, pid, meilleur[(pid, d_)], lib))
            else:
                filtre.append((d_, pid, v, lib))
        evenements = filtre
        print(f"  correction 1 : {n_retires} bonus de tour cumules supprimes")

    # Les passes valent 0,75 et les corrections d'objectivite (prorata,
    # distinctions /2) produisent des decimales. On NE arrondit PLUS chaque
    # evenement a l'entier — round(0,75)=1 gonflerait une passe isolee au
    # niveau d'un but. On garde donc les evenements en valeur reelle
    # (2 decimales) et on n'arrondit qu'au total par joueur : le classement
    # reste en points entiers, sans ecraser le poids exact de chaque action.
    evenements = [(d, pid, round(v, 2), l) for d, pid, v, l in evenements]

    total_reel = defaultdict(float)
    for _d, pid, p, _l in evenements:
        total_reel[pid] += p
    total = {pid: round(v) for pid, v in total_reel.items()}
    # Le classement se fait sur la valeur REELLE, pas sur l'arrondi : sinon
    # deux joueurs affiches a 137 (136,63 et 137,25) sont departages au
    # hasard, et celui arrondi vers le haut peut passer devant celui arrondi
    # vers le bas. A affichage egal, le plus fort en points reels est premier.
    top = sorted(total_reel, key=lambda p: -total_reel[p])[:pool_n]
    garde = set(top)
    evenements = sorted((e for e in evenements if e[1] in garde),
                        key=lambda e: (e[0], e[1]))

    SORTIE.write_text(json.dumps({
        "saison": "2025/2026",
        "joueurs": [{"id": p, "nom": noms[p], "club": clubs.get(p),
                     "team_id": equipes.get(p), "minutes": round(minutes[p]),
                     "total": total[p]} for p in top],
        "evenements": [[d, p, v, l] for d, p, v, l in evenements],
    }, ensure_ascii=False), encoding="utf-8")

    print(f"\n{len(evenements)} evenements sur {len(top)} joueurs -> {SORTIE} "
          f"({SORTIE.stat().st_size / 1024:.0f} Ko)")
    print(f"Periode : {evenements[0][0]} -> {evenements[-1][0]}\n")
    print("Classement :\n")
    for k, pid in enumerate(top[:20], 1):
        print(f"  {k:>2}. {noms[pid][:26]:<28} {total[pid]:>6d}"
              f"{' (M)' if pid in manuels else '    '}  {str(clubs.get(pid))[:22]}")

    conn.close()


if __name__ == "__main__":
    main()
