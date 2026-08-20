"""
Zdieľaný pomocník pre vizuálne regresné testy.

`compare_with_baseline()` porovná aktuálny screenshot s baseline a pri zlyhaní
uloží do `e2e/diffs/<name>/` artefakty:
  - `baseline.png`  – očakávaný stav,
  - `actual.png`    – aktuálny stav,
  - `diff.png`      – zvýraznené rozdiely (červené pixely nad prahom),
  - `side_by_side.png` – baseline | actual | diff vedľa seba.

Prahy a tolerancie sa čítajú z `e2e/visual_budget.json`:
  - `default_tolerance` – povolený podiel odlišných pixelov,
  - `overrides`         – tolerancia podľa prefixu názvu snapshotu,
  - `pixel_threshold`   – citlivosť na rozdiel jasu (antialiasing/šum),
  - `ci`                – automatický limit veľkosti zmien pre celý beh.

Prepísať sa dajú premennými prostredia:
  VISUAL_TOLERANCE, VISUAL_PIXEL_THRESHOLD,
  VISUAL_MAX_CHANGED_RATIO, VISUAL_MAX_TOTAL_DIFF.

CI tieto priečinky nahráva ako artefakt, takže je hneď vidno, čo sa zmenilo.
"""
import json
import os
from pathlib import Path

ROOT = Path(__file__).parent
BASELINES = ROOT / "baselines"
DIFFS = ROOT / "diffs"
BUDGET_FILE = ROOT / "visual_budget.json"


def _load_budget():
    try:
        cfg = json.loads(BUDGET_FILE.read_text())
    except Exception:
        cfg = {}
    cfg.setdefault("default_tolerance", 0.01)
    cfg.setdefault("pixel_threshold", 12)
    cfg.setdefault("overrides", {})
    cfg.setdefault("ci", {})
    ci = cfg["ci"]
    ci.setdefault("max_changed_snapshots_ratio", 0.25)
    ci.setdefault("max_total_diff_ratio", 0.05)
    ci.setdefault("min_snapshots_for_ratio_check", 4)
    if os.environ.get("VISUAL_TOLERANCE"):
        cfg["default_tolerance"] = float(os.environ["VISUAL_TOLERANCE"])
    if os.environ.get("VISUAL_PIXEL_THRESHOLD"):
        cfg["pixel_threshold"] = int(os.environ["VISUAL_PIXEL_THRESHOLD"])
    if os.environ.get("VISUAL_MAX_CHANGED_RATIO"):
        ci["max_changed_snapshots_ratio"] = float(os.environ["VISUAL_MAX_CHANGED_RATIO"])
    if os.environ.get("VISUAL_MAX_TOTAL_DIFF"):
        ci["max_total_diff_ratio"] = float(os.environ["VISUAL_MAX_TOTAL_DIFF"])
    return cfg


BUDGET = _load_budget()
PIXEL_THRESHOLD = BUDGET["pixel_threshold"]
DEFAULT_TOLERANCE = BUDGET["default_tolerance"]

# Štatistika behu – používa ju enforce_budget().
stats = {"compared": 0, "changed": 0, "new": 0, "sum_ratio": 0.0, "worst": ("", 0.0)}


def tolerance_for(name: str, fallback: float | None = None) -> float:
    """Tolerancia pre daný snapshot (prefix override > argument > default)."""
    for prefix, value in BUDGET["overrides"].items():
        if name.startswith(prefix):
            return float(value)
    return DEFAULT_TOLERANCE if fallback is None else fallback


def compare_with_baseline(name: str, shot: Path, tolerance: float | None = None, update: bool = False):
    """Vráti (status, detail): status ∈ {"new", "pass", "fail"}."""
    from PIL import Image, ImageChops

    tol = tolerance_for(name, tolerance)

    BASELINES.mkdir(parents=True, exist_ok=True)
    baseline = BASELINES / f"{name}.png"
    if update or not baseline.exists():
        baseline.write_bytes(shot.read_bytes())
        stats["new"] += 1
        return "new", baseline.name

    a = Image.open(baseline).convert("RGB")
    b = Image.open(shot).convert("RGB")
    stats["compared"] += 1
    if a.size != b.size:
        stats["changed"] += 1
        stats["sum_ratio"] += 1.0
        stats["worst"] = (name, 1.0)
        _write_artifacts(name, a, b, None)
        return "fail", f"rozmery {a.size} != {b.size} (artefakty: e2e/diffs/{name})"

    gray = ImageChops.difference(a, b).convert("L")
    changed = sum(1 for px in gray.getdata() if px > PIXEL_THRESHOLD)
    ratio = changed / (a.size[0] * a.size[1])
    stats["sum_ratio"] += ratio
    if ratio > stats["worst"][1]:
        stats["worst"] = (name, ratio)
    if ratio <= tol:
        return "pass", f"odlišných pixelov {ratio:.2%} (limit {tol:.2%})"

    stats["changed"] += 1
    _write_artifacts(name, a, b, gray)
    return "fail", f"odlišných pixelov {ratio:.2%} > {tol:.2%} (artefakty: e2e/diffs/{name})"


def enforce_budget(verbose: bool = True):
    """Automatický limit veľkosti zmien pre celý beh.

    Vráti (ok, správa). Slúži na to, aby jednotlivé mikro-rozdiely
    nespôsobovali falošné zlyhania, ale plošná zmena UI sa zachytila.
    """
    ci = BUDGET["ci"]
    compared = stats["compared"]
    if compared == 0:
        return True, "žiadne porovnania (iba nové baseliny)"

    changed_ratio = stats["changed"] / compared
    total_ratio = stats["sum_ratio"] / compared
    msg = (
        f"zmenených snapshotov {stats['changed']}/{compared} ({changed_ratio:.0%}), "
        f"priemerný diff {total_ratio:.2%}, najhorší {stats['worst'][0]} {stats['worst'][1]:.2%}"
    )
    ok = True
    if compared >= ci["min_snapshots_for_ratio_check"]:
        if changed_ratio > ci["max_changed_snapshots_ratio"]:
            ok = False
            msg += f" | prekročený limit zmenených snapshotov ({ci['max_changed_snapshots_ratio']:.0%})"
        if total_ratio > ci["max_total_diff_ratio"]:
            ok = False
            msg += f" | prekročený limit priemerného diffu ({ci['max_total_diff_ratio']:.0%})"
    if verbose:
        print(("PASS " if ok else "FAIL ") + "vizuálny rozpočet :: " + msg)
    return ok, msg


def _write_artifacts(name: str, baseline_img, actual_img, gray):
    from PIL import Image

    out = DIFFS / name
    out.mkdir(parents=True, exist_ok=True)
    baseline_img.save(out / "baseline.png")
    actual_img.save(out / "actual.png")

    if gray is None:
        return

    # highlight: aktuálny snímok stlmený + červené rozdiely
    highlight = actual_img.copy().convert("RGB")
    px = highlight.load()
    gpx = gray.load()
    w, h = highlight.size
    for y in range(h):
        for x in range(w):
            if gpx[x, y] > PIXEL_THRESHOLD:
                px[x, y] = (255, 0, 0)
            else:
                r, g, b = px[x, y]
                px[x, y] = (r // 3 + 170, g // 3 + 170, b // 3 + 170)
    highlight.save(out / "diff.png")

    total_w = w * 3 + 20
    combo = Image.new("RGB", (total_w, h), (255, 255, 255))
    combo.paste(baseline_img, (0, 0))
    combo.paste(actual_img, (w + 10, 0))
    combo.paste(highlight, (w * 2 + 20, 0))
    combo.save(out / "side_by_side.png")
