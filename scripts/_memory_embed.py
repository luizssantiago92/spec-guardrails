"""Optional chunk embeddings for semantic retrieval."""

from __future__ import annotations

import hashlib
import json
import os
import struct
import urllib.error
import urllib.request
from typing import Callable

HASH_DIMS = 64
OPENAI_DIMS = 256


def pack_vector(values: list[float]) -> bytes:
    return struct.pack(f"{len(values)}f", *values)


def unpack_vector(blob: bytes) -> list[float]:
    count = len(blob) // 4
    return list(struct.unpack(f"{count}f", blob))


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if len(a) != len(b) or not a:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x * x for x in a) ** 0.5
    norm_b = sum(y * y for y in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def hash_embed(text: str, dims: int = HASH_DIMS) -> list[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    values: list[float] = []
    counter = 0
    while len(values) < dims:
        block = hashlib.sha256(digest + counter.to_bytes(2, "big")).digest()
        for i in range(0, len(block), 4):
            if len(values) >= dims:
                break
            chunk = block[i : i + 4]
            if len(chunk) < 4:
                break
            integer = int.from_bytes(chunk, "big", signed=False)
            values.append((integer / 2**31) - 1.0)
        counter += 1
    return values


def openai_embed(text: str, model: str) -> list[float]:
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is required for provider openai")

    payload = json.dumps({"input": text, "model": model}).encode("utf-8")
    request = urllib.request.Request(
        "https://api.openai.com/v1/embeddings",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        detail = err.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"OpenAI embeddings failed: {detail}") from err

    vector = body["data"][0]["embedding"]
    if len(vector) > OPENAI_DIMS:
        vector = vector[:OPENAI_DIMS]
    return [float(value) for value in vector]


def ollama_embed(text: str, model: str) -> list[float]:
    host = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
    payload = json.dumps({"model": model, "prompt": text}).encode("utf-8")
    request = urllib.request.Request(
        f"{host}/api/embeddings",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as err:
        raise RuntimeError(f"Ollama embeddings failed: {err}") from err

    vector = body.get("embedding") or []
    if not vector:
        raise RuntimeError("Ollama returned an empty embedding vector")
    if len(vector) > OPENAI_DIMS:
        vector = vector[:OPENAI_DIMS]
    return [float(value) for value in vector]


def get_embed_fn(provider: str, model: str) -> Callable[[str], list[float]]:
    normalized = provider.strip().lower()
    if normalized in {"none", ""}:
        raise RuntimeError("semantic retrieval is disabled (provider none)")
    if normalized == "hash":
        return lambda text: hash_embed(text)
    if normalized == "openai":
        return lambda text: openai_embed(text, model)
    if normalized == "ollama":
        return lambda text: ollama_embed(text, model)
    raise RuntimeError(f"Unknown embedding provider: {provider}")
