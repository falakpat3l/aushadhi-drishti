"""Download retries and the fall back to an older cached copy (no network used)."""
import io
import sys
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "pipeline"))

import fetch  # noqa: E402

URL = "https://example.org/data.csv"


class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.close()


def http_error(code):
    return urllib.error.HTTPError(URL, code, "error", {}, None)


class FetchTest(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.folder = Path(self.dir.name)
        patches = [
            mock.patch.object(fetch, "allowed_by_robots", return_value=True),
            mock.patch.object(fetch.time, "sleep"),
            mock.patch.object(fetch, "_wait_turn"),
        ]
        for p in patches:
            p.start()
            self.addCleanup(p.stop)

    def tearDown(self):
        self.dir.cleanup()

    def get(self, side_effect):
        with mock.patch.object(fetch.urllib.request, "urlopen", side_effect=side_effect) as m:
            path = fetch.download(URL, name="data.csv", refresh=True, folder=self.folder)
        return path, m.call_count

    def test_retries_then_succeeds(self):
        path, calls = self.get([urllib.error.URLError("down"), FakeResponse(b"new")])
        self.assertEqual(calls, 2)
        self.assertEqual(path.read_bytes(), b"new")

    def test_site_down_uses_old_copy(self):
        (self.folder / "data.csv").write_bytes(b"old")
        path, calls = self.get(urllib.error.URLError("down"))
        self.assertEqual(calls, fetch.TRIES)
        self.assertEqual(path.read_bytes(), b"old")
        self.assertFalse((self.folder / "data.part").exists())

    def test_not_found_is_not_retried(self):
        (self.folder / "data.csv").write_bytes(b"old")
        path, calls = self.get(http_error(404))
        self.assertEqual(calls, 1)
        self.assertEqual(path.read_bytes(), b"old")

    def test_too_many_requests_is_retried(self):
        path, calls = self.get([http_error(429), FakeResponse(b"new")])
        self.assertEqual(calls, 2)
        self.assertEqual(path.read_bytes(), b"new")

    def test_no_old_copy_still_fails(self):
        with self.assertRaises(urllib.error.URLError):
            self.get(urllib.error.URLError("down"))


if __name__ == "__main__":
    unittest.main()
