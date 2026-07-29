#!/usr/bin/env python3
"""
Sonde pour retrouver la vraie stat "pressing haut / ballon gagne dans le
dernier tiers", introuvable dans la table agregee v_stat.

Elle cherche a deux endroits :
  1. fotmob.db  — toutes les tables/colonnes, et un eventuel JSON brut stocke
                  en base (colonnes de type texte contenant du JSON).
  2. cache/matches/*.json — les fichiers bruts FotMob ingeres, ou FotMob
     expose parfois des champs plus fins que la table agregee.

Elle affiche tous les champs dont le nom evoque le pressing/la recuperation
dans le camp adverse, avec un exemple de valeur. Colle-moi la sortie : je
brancherai la bonne cle dans export_radar.py.

Usage :
    py probe_pressing.py
"""

import json
import pathlib
import re
import sqlite3

DB_PATH = pathlib.Path("fotmob.db")
CACHE_DIRS = [pathlib.Path("cache/matches"), pathlib.Path("cache"),
              pathlib.Path("matches")]

# Mots-cles evocateurs (insensible a la casse).
MOTS = re.compile(
    r"recover|poss.?won|won.?poss|pressing|press_|final.?third|"
    r"att.?3rd|3rd|third|turnover|high.?turn|regain|ballon|duel|tackl|"
    r"interc|def.?action",
    re.I,
)


def sonde_db() -> None:
    if not DB_PATH.exists():
        print("[db] fotmob.db introuvable, saute.")
        return
    conn = sqlite3.connect(DB_PATH)
    print("=== fotmob.db : tables et colonnes ===")
    tables = [r[0] for r in conn.execute(
        "SELECT name FROM sqlite_master WHERE type IN ('table','view')")]
    for t in tables:
        cols = [c[1] for c in conn.execute(f"PRAGMA table_info({t})")]
        hits = [c for c in cols if MOTS.search(c)]
        marque = "  <-- candidats: " + ", ".join(hits) if hits else ""
        print(f"  {t} ({len(cols)} col){marque}")

    # Cles de stats deja connues (rappel), au cas ou une variante existe.
    try:
        print("\n=== stat_key contenant un mot-cle ===")
        for k, n in conn.execute(
                "SELECT stat_key, COUNT(*) FROM v_stat GROUP BY stat_key"):
            if MOTS.search(k):
                print(f"  {k:<34} {n}")
    except sqlite3.OperationalError:
        pass

    # JSON brut eventuellement stocke en base.
    print("\n=== colonnes texte contenant du JSON (echantillon) ===")
    for t in tables:
        cols = [c[1] for c in conn.execute(f"PRAGMA table_info({t})")]
        for c in cols:
            try:
                row = conn.execute(
                    f"SELECT {c} FROM {t} WHERE {c} LIKE '%{{%}}%' LIMIT 1"
                ).fetchone()
            except sqlite3.OperationalError:
                continue
            if row and row[0]:
                trouve = sorted(set(m.group(0) for m in re.finditer(
                    r'"[^"]*(?:recover|poss|press|third|3rd|turnover)[^"]*"',
                    str(row[0]), re.I)))
                if trouve:
                    print(f"  {t}.{c} -> {trouve[:12]}")
    conn.close()


def _walk(obj, prefix=""):
    """Parcourt un JSON et yield (chemin, valeur) des feuilles."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from _walk(v, f"{prefix}.{k}")
    elif isinstance(obj, list):
        for i, v in enumerate(obj[:3]):
            yield from _walk(v, f"{prefix}[{i}]")
    else:
        yield prefix, obj


def sonde_cache() -> None:
    d = next((p for p in CACHE_DIRS if p.exists()), None)
    if not d:
        print("\n[cache] aucun dossier cache/matches trouve, saute.")
        return
    fichiers = sorted(d.glob("*.json"))[:1]
    if not fichiers:
        print(f"\n[cache] {d} ne contient pas de .json.")
        return
    print(f"\n=== cache brut : {fichiers[0]} ===")
    data = json.loads(fichiers[0].read_text(encoding="utf-8"))
    vus = {}
    for chemin, val in _walk(data):
        feuille = chemin.split(".")[-1].split("[")[0]
        if MOTS.search(feuille) and feuille not in vus:
            vus[feuille] = (chemin, val)
    if not vus:
        print("  aucun champ evocateur trouve dans ce match.")
    for feuille, (chemin, val) in sorted(vus.items()):
        print(f"  {feuille:<26} ex: {str(val)[:40]:<42} ({chemin})")


if __name__ == "__main__":
    sonde_db()
    sonde_cache()
    print("\n>>> Colle cette sortie dans le chat : je branche la bonne stat.")
