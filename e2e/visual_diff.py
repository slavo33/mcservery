"""
Zdieľaný pomocník pre vizuálne regresné testy.

`compare_with_baseline()` porovná aktuálny screenshot s baseline a pri zlyhaní
uloží do `e2e/diffs/<name>/` tri artefakty:
  - `baseline.png`  – očakávaný stav,
  - `actual.png`    – aktuálny stav,
  - `diff.png`      – zvýraznené rozdiely (červené pixely nad prahom),
  - `side_by_side.png` – baseline | actual | diff vedľa seba.

CI tieto priečinky nahráva ako artefakt, takže je hneď vidno, čo sa zmenilo.
"""
from pathlib import Path

ROOT = Path(__file__).parent
BASELINES = ROOT / "baselines"
DIFFS = ROOT / "diffs"
PIXEL_THRESHOLD = 12


def compare_with_baseline(name: str, shot: Path, tolerance: float = 0.01, update: bool = False):
    """Vráti (status, detail): status ∈ {"new", "pass", "fail"}."""
    from PIL import Image, ImageChops

    BASELINES.mkdir(parents=True, exist_ok=True)
    baseline = BASELINES / f"{name}.png"
    if update or not baseline.exists():
        baseline.write_bytes(shot.read_bytes())
        return "new", baseline.name

    a = Image.open(baseline).convert("RGB")
    b = Image.open(shot).convert("RGB")
    if a.size != b.size:
        _write_artifacts(name, a, b, None)
        return "fail", f"rozmery {a.size} != {b.size} (artefakty: e2e/diffs/{name})"

    gray = ImageChops.difference(a, b).convert("L")
    changed = sum(1 for px in gray.getdata() if px > PIXEL_THRESHOLD)
    ratio = changed / (a.size[0] * a.size[1])
    if ratio <= tolerance:
        return "pass", f"odlišných pixelov {ratio:.2%}"

    _write_artifacts(name, a, b, gray)
    return "fail", f"odlišných pixelov {ratio:.2%} (artefakty: e2e/diffs/{name})"


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
