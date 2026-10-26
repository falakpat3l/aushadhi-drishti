"""Polite downloads with a local cache.

- Every request names this project in its User-Agent.
- Sites other than GitHub are checked against their robots.txt first.
- Downloads are cached in pipeline/.cache, so a rebuild does not fetch again
  unless --refresh is passed.
"""
import hashlib
import time
import urllib.parse
import urllib.request
import urllib.robotparser
from pathlib import Path

from config import CACHE, USER_AGENT

_robots = {}
_last_call = {}


class Blocked(Exception):
    """The site's robots.txt does not allow this fetch."""


def allowed_by_robots(url):
    host = urllib.parse.urlsplit(url).netloc
    if host.endswith("github.com") or host.endswith("githubusercontent.com"):
        return True
    if host not in _robots:
        rp = urllib.robotparser.RobotFileParser()
        rp.set_url(f"https://{host}/robots.txt")
        try:
            req = urllib.request.Request(f"https://{host}/robots.txt", headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=30) as r:
                rp.parse(r.read().decode("utf-8", "replace").splitlines())
        except Exception:
            rp.parse([])  # no robots.txt: allowed
        _robots[host] = rp
    return _robots[host].can_fetch(USER_AGENT, url)


def _wait_turn(host, min_gap):
    """Keep at least min_gap seconds between calls to one host."""
    gap = time.time() - _last_call.get(host, 0)
    if gap < min_gap:
        time.sleep(min_gap - gap)
    _last_call[host] = time.time()


def download(url, name=None, refresh=False, offline=False, min_gap=1.0, data=None, timeout=300, folder=None, headers=None):
    """Return the local path of url, downloading it if needed.
    `folder` puts the file somewhere other than the cache (for very big files)."""
    where = Path(folder) if folder else CACHE
    where.mkdir(parents=True, exist_ok=True)
    key = name or hashlib.sha1((url + (data or "")).encode()).hexdigest()[:16]
    path = where / key
    if path.exists() and not refresh:
        return path
    if offline:
        raise FileNotFoundError(f"offline and not cached: {url}")
    if not allowed_by_robots(url):
        raise Blocked(url)
    host = urllib.parse.urlsplit(url).netloc
    _wait_turn(host, min_gap)
    body = data.encode() if data else None
    req = urllib.request.Request(url, data=body, headers={"User-Agent": USER_AGENT, **(headers or {})})
    tmp = path.with_suffix(".part")
    with urllib.request.urlopen(req, timeout=timeout) as r, open(tmp, "wb") as f:
        while chunk := r.read(1 << 20):
            f.write(chunk)
    tmp.replace(path)
    return path


def fetched_at(path: Path):
    return time.strftime("%Y-%m-%d", time.gmtime(path.stat().st_mtime))
