"""Extra checks that run inside tests/browser_check.py, one per phase."""


def district_detail(page, name):
    """Phase 2: the test district opens with the right official numbers."""
    ok = page.evaluate("(n) => window.__ad.layers.showDistrict(n)", "Bharuch")
    assert ok, "Bharuch not found on the map"
    page.wait_for_timeout(1500)
    text = page.inner_text("#detail")
    assert "15,51,019" in text, "Bharuch population missing"
    assert "14" in text, "Bharuch Kendra count missing"
    page.screenshot(path=f"docs/images/{name}-bharuch.png")


def layer_switches(page, name):
    """Phase 2: every enabled layer switch can be turned on without errors."""
    for box in page.query_selector_all("input[data-layer]:not([disabled])"):
        if not box.is_checked():
            box.check()
    page.wait_for_timeout(2500)
    page.screenshot(path=f"docs/images/{name}-layers.png")


STEPS = [("district detail", district_detail), ("layer switches", layer_switches)]
