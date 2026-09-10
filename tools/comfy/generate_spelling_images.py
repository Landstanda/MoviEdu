"""Walk words.csv and generate one ComfyUI flashcard PNG per row.

Default: rows where moviedu_priority == start-here. Skips a word if
assets/spelling/<word>.png already exists (delete the PNG to regenerate).

ComfyUI must already be running (http://127.0.0.1:8188). This script does
not call Unsloth Studio or LangGraph.

From the MoviEdu repo root:

    python tools/comfy/generate_spelling_images.py
    python tools/comfy/generate_spelling_images.py --priority good-fit
    python tools/comfy/generate_spelling_images.py --words cat,bag --force
    python tools/comfy/generate_spelling_images.py --map-only
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import shutil
import sys
import time
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

from spelling_prompts import SUBJECTS, prompt_for  # noqa: E402

DEFAULT_CSV = REPO / "education" / "kindergarten" / "words.csv"
DEFAULT_OUT = REPO / "assets" / "spelling"
DEFAULT_MAP = REPO / "src" / "spellingImages.ts"
COMFY_OUTPUT = Path(os.environ.get("COMFY_OUTPUT", r"E:\ComfyUI\ComfyUI\output"))

UNET = "boogu_image_turbo_fp8_scaled.safetensors"
CLIP = "qwen3vl_8b_fp8_scaled.safetensors"
VAE = "ae.safetensors"
WIDTH = 640
HEIGHT = 480


def load_words(path: Path, priorities: set[str] | None, only: set[str] | None) -> list[str]:
    with path.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames or "word" not in reader.fieldnames:
            raise SystemExit(f"Need a word column, got {reader.fieldnames}")
        has_priority = "moviedu_priority" in reader.fieldnames
        words: list[str] = []
        seen: set[str] = set()
        for rec in reader:
            word = str(rec.get("word") or "").strip().lower()
            if not word or word in seen:
                continue
            if only is not None and word not in only:
                continue
            if priorities is not None:
                if not has_priority:
                    raise SystemExit("CSV has no moviedu_priority column")
                pri = str(rec.get("moviedu_priority") or "").strip()
                if pri not in priorities:
                    continue
            seen.add(word)
            words.append(word)
    missing = [w for w in words if w not in SUBJECTS]
    if missing:
        raise SystemExit(
            "No prompt in spelling_prompts.py SUBJECTS for: " + ", ".join(missing)
        )
    extra = sorted(set(SUBJECTS) - set(words))
    if extra and only is None:
        print(f"Note: unused prompt keys {extra}", flush=True)
    return words


def api_graph(text: str, prefix: str, seed: int) -> dict:
    return {
        "2": {
            "class_type": "UNETLoader",
            "inputs": {"unet_name": UNET, "weight_dtype": "default"},
        },
        "5": {"class_type": "VAELoader", "inputs": {"vae_name": VAE}},
        "7": {
            "class_type": "CLIPLoader",
            "inputs": {"clip_name": CLIP, "type": "boogu", "device": "default"},
        },
        "8": {
            "class_type": "EmptyLatentImage",
            "inputs": {"width": WIDTH, "height": HEIGHT, "batch_size": 1},
        },
        "11": {
            "class_type": "CLIPTextEncode",
            "inputs": {"clip": ["7", 0], "text": text},
        },
        "9": {
            "class_type": "ConditioningZeroOut",
            "inputs": {"conditioning": ["11", 0]},
        },
        "32": {
            "class_type": "KSampler",
            "inputs": {
                "model": ["2", 0],
                "positive": ["11", 0],
                "negative": ["9", 0],
                "latent_image": ["8", 0],
                "seed": seed,
                "steps": 4,
                "cfg": 1,
                "sampler_name": "lcm",
                "scheduler": "sgm_uniform",
                "denoise": 1,
            },
        },
        "3": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["32", 0], "vae": ["5", 0]},
        },
        "33": {
            "class_type": "SaveImage",
            "inputs": {"images": ["3", 0], "filename_prefix": prefix},
        },
    }


def _http_json(url: str, payload: dict | None = None, timeout: float = 60.0) -> dict:
    data = None if payload is None else json.dumps(payload).encode()
    headers = {"Content-Type": "application/json"} if payload is not None else {}
    req = Request(url, data=data, headers=headers)
    with urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode())


def queue_prompt(comfy: str, prompt: dict) -> str:
    body = {"prompt": prompt, "client_id": str(uuid.uuid4())}
    resp = _http_json(f"{comfy.rstrip('/')}/prompt", body)
    errors = resp.get("node_errors") or {}
    if errors:
        raise RuntimeError(f"Comfy node_errors: {errors}")
    pid = resp.get("prompt_id")
    if not pid:
        raise RuntimeError(f"Comfy queue failed: {resp}")
    return str(pid)


def wait_history(comfy: str, prompt_id: str, timeout: float) -> dict:
    deadline = time.time() + timeout
    url = f"{comfy.rstrip('/')}/history/{prompt_id}"
    while time.time() < deadline:
        try:
            hist = _http_json(url, timeout=15)
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
            time.sleep(2)
            continue
        if prompt_id in hist:
            return hist[prompt_id]
        time.sleep(1.5)
    raise TimeoutError(f"Comfy prompt {prompt_id} did not finish in {timeout:.0f}s")


def saved_png(history: dict, comfy_output: Path) -> Path:
    outputs = history.get("outputs") or {}
    for node in outputs.values():
        for img in node.get("images") or []:
            if img.get("type") != "output":
                continue
            sub = img.get("subfolder") or ""
            name = img.get("filename") or ""
            path = comfy_output / sub / name if sub else comfy_output / name
            if path.is_file():
                return path
    raise FileNotFoundError(f"No output png in history: {outputs}")


def generate_word(
    word: str,
    dest: Path,
    comfy: str,
    timeout: float,
    comfy_output: Path,
    force: bool,
) -> dict:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.is_file() and not force:
        return {
            "word": word,
            "path": str(dest),
            "bytes": dest.stat().st_size,
            "skipped": True,
            "ok": True,
        }
    text = prompt_for(word)
    seed = int(hashlib.md5(word.encode("utf-8")).hexdigest()[:8], 16) % (2**31)
    prefix = f"spelling_k/{word}"
    t0 = time.perf_counter()
    prompt_id = queue_prompt(comfy, api_graph(text, prefix, seed))
    history = wait_history(comfy, prompt_id, timeout)
    status = (history.get("status") or {}).get("status_str")
    if status and status != "success":
        raise RuntimeError(f"{word}: Comfy status {history.get('status')}")
    src = saved_png(history, comfy_output)
    shutil.copy2(src, dest)
    elapsed = time.perf_counter() - t0
    return {
        "word": word,
        "path": str(dest),
        "bytes": dest.stat().st_size,
        "skipped": False,
        "ok": True,
        "seconds": round(elapsed, 1),
        "prompt_id": prompt_id,
        "comfy_file": str(src),
    }


def write_image_map(out_dir: Path, map_path: Path) -> int:
    stems = sorted(p.stem.lower() for p in out_dir.glob("*.png"))
    lines = [
        "/* Generated by tools/comfy/generate_spelling_images.py — do not edit by hand. */",
        "import type { ImageSourcePropType } from 'react-native';",
        "",
        "export const SPELLING_IMAGES: Record<string, ImageSourcePropType> = {",
    ]
    for stem in stems:
        lines.append(f"  {stem}: require('../assets/spelling/{stem}.png'),")
    lines.extend(
        [
            "};",
            "",
            "export function spellingImageSource(",
            "  word: string,",
            "  customUri?: string | null,",
            "): ImageSourcePropType | null {",
            "  if (customUri) {",
            "    return { uri: customUri };",
            "  }",
            "  const key = word.trim().toLowerCase();",
            "  return SPELLING_IMAGES[key] ?? null;",
            "}",
            "",
        ]
    )
    map_path.write_text("\n".join(lines), encoding="utf-8")
    return len(stems)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--input", type=Path, default=DEFAULT_CSV)
    p.add_argument("--output", type=Path, default=DEFAULT_OUT)
    p.add_argument("--map", type=Path, default=DEFAULT_MAP)
    p.add_argument("--comfy", default="http://127.0.0.1:8188")
    p.add_argument(
        "--comfy-output",
        type=Path,
        default=COMFY_OUTPUT,
        help="ComfyUI output folder (files it writes before we copy/rename)",
    )
    p.add_argument("--timeout", type=float, default=180.0)
    p.add_argument(
        "--priority",
        action="append",
        dest="priorities",
        help="moviedu_priority value to include (repeatable). Default: start-here",
    )
    p.add_argument(
        "--all-rows",
        action="store_true",
        help="Use every CSV row that has a SUBJECTS prompt (ignore priority)",
    )
    p.add_argument(
        "--words",
        default="",
        help="Comma-separated words only (still need SUBJECTS entries)",
    )
    p.add_argument("--limit", type=int, default=0, help="First N matching words only")
    p.add_argument(
        "--force",
        action="store_true",
        help="Regenerate even if <word>.png already exists",
    )
    p.add_argument(
        "--map-only",
        action="store_true",
        help="Rewrite src/spellingImages.ts from existing PNGs; do not call Comfy",
    )
    return p.parse_args()


def main() -> int:
    args = parse_args()
    args.output.mkdir(parents=True, exist_ok=True)

    if args.map_only:
        n = write_image_map(args.output, args.map)
        print(json.dumps({"map": str(args.map), "pngs": n}, indent=2))
        return 0

    only = {w.strip().lower() for w in args.words.split(",") if w.strip()} or None
    if args.all_rows:
        priorities = None
    else:
        priorities = set(args.priorities or ["start-here"])

    records = load_words(args.input, priorities, only)
    if args.limit:
        records = records[: args.limit]
    print(
        f"Loaded {len(records)} words  {WIDTH}x{HEIGHT}  -> {args.output}",
        flush=True,
    )
    try:
        _http_json(f"{args.comfy.rstrip('/')}/system_stats", timeout=5)
    except Exception as exc:
        raise SystemExit(
            f"ComfyUI is not reachable at {args.comfy}. Start it first. ({exc})"
        ) from exc

    kept: list[dict] = []
    for i, word in enumerate(records, start=1):
        dest = args.output / f"{word}.png"
        print(f"  {i}/{len(records)}  {word}", flush=True)
        try:
            hit = generate_word(
                word, dest, args.comfy, args.timeout, args.comfy_output, args.force
            )
        except Exception as exc:
            print(f"    ! {exc}", flush=True)
            kept.append({"word": word, "ok": False, "error": str(exc)})
            continue
        note = "skip-exists" if hit.get("skipped") else f"{hit.get('bytes')}B {hit.get('seconds')}s"
        print(f"    -> {note}  {dest}", flush=True)
        kept.append(hit)

    n = write_image_map(args.output, args.map)
    manifest = args.output / "manifest.json"
    manifest.write_text(json.dumps(kept, indent=2), encoding="utf-8")
    ok = sum(1 for row in kept if row.get("ok") and not row.get("error"))
    failed = [row["word"] for row in kept if not row.get("ok")]
    print(
        json.dumps(
            {
                "ok": ok,
                "failed": failed,
                "output": str(args.output),
                "manifest": str(manifest),
                "map": str(args.map),
                "map_pngs": n,
            },
            indent=2,
        )
    )
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
