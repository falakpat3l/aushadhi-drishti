"""Extra checks that run inside tests/browser_check.py, one per phase."""


def district_detail(page, name):
    """Phase 2: the test district opens with the right official numbers."""
    assert "in India" in page.inner_text("#ranking"), "All-India ranking missing"
    ok = page.evaluate("(n) => window.__ad.layers.showDistrict(n)", "Bharuch")
    assert ok, "Bharuch not found on the map"
    page.wait_for_timeout(1500)
    text = page.inner_text("#detail")
    assert "15,51,019" in text, "Bharuch population missing"
    assert "Gujarat" in page.inner_text("#detail-section"), "state name missing from district details"
    assert "in Gujarat" in page.inner_text("#ranking"), "state ranking missing after opening a district"
    assert "14" in text, "Bharuch Kendra count missing"
    assert "Gap score" in text and "rank" in text, "Phase 3: gap score missing"
    assert page.inner_text("#ranking").count("\n") >= 3, "Phase 3: ranking list missing"
    page.screenshot(path=f"docs/images/{name}-bharuch.png")


def layer_switches(page, name):
    """Phase 2: pick a state, then every enabled layer switch can be turned on without errors."""
    page.evaluate("() => window.__ad.layers.pickState(null)")
    page.wait_for_timeout(800)
    page.click("button[data-level=state]")
    page.wait_for_timeout(800)
    assert "States most in need" in page.inner_text("#ranking"), "state-level view missing"
    page.click("button[data-level=district]")
    page.evaluate("() => window.__ad.layers.pickState('gujarat')")
    page.wait_for_timeout(2500)
    assert page.eval_on_selector("#state-pick", "el => el.value") == "gujarat", "state picker did not change"
    assert "in Gujarat" in page.inner_text("#ranking"), "state ranking missing"
    assert page.eval_on_selector("#metric", "el => el.value") == "gap_score_state", "state gap score not shown"
    for box in page.query_selector_all("label:not([hidden]) > input[data-layer]"):
        if not box.is_checked():
            box.check()
    page.wait_for_timeout(2500)
    page.screenshot(path=f"docs/images/{name}-layers.png")


def medicine_panel(page, name):
    """Phase 4: alerts timeline, alert dots and the medicine check, on sample data."""
    from pathlib import Path
    fx = Path(__file__).resolve().parent / "fixtures"
    p2 = page.context.browser.new_page(viewport=page.viewport_size)
    errors = []
    p2.on("pageerror", lambda e: errors.append(str(e)))
    p2.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    p2.route("**/*", lambda route: _stub(route, fx))
    p2.goto(page.url, wait_until="networkidle")
    p2.wait_for_function("window.__ad && window.__ad.ready", timeout=30000)
    p2.evaluate("window.__ad.ui.open()")
    p2.wait_for_timeout(400)
    assert p2.query_selector_all(".timeline span"), "Phase 4: timeline bars missing"
    p2.check("input[data-layer=alerts]")
    p2.click(".timeline span >> nth=1")
    assert "Showing" in p2.inner_text("#alert-timeline"), "Phase 4: month filter did not apply"
    p2.fill("#med-input", "Dolo 650")
    p2.click("#med-form button")
    p2.wait_for_function("document.querySelector('#med-result').innerText.includes('Paracetamol')", timeout=20000)
    text = p2.inner_text("#med-result")
    assert "Rs 1.97" in text, "Phase 4: ceiling price not shown"
    assert "quality alert sample" in text and "mentions Paracetamol" in text, "Phase 4: alert count missing"
    assert "CDSCO list" in text, "Phase 4: link to the official CDSCO list missing"
    p2.screenshot(path=f"docs/images/{name}-medicines.png", full_page=False)
    p2.close()
    assert not errors, "; ".join(errors)


def _stub(route, fx):
    url = route.request.url
    if url.endswith("/data/alerts.json"):
        return route.fulfill(status=200, content_type="application/json", body=(fx / "alerts_sample.json").read_text())
    if url.endswith("/data/medicines.json"):
        return route.fulfill(status=200, content_type="application/json", body=(fx / "medicines_sample.json").read_text())
    from browser_check import stub_outside
    return stub_outside(route)


def ask_box(page, name):
    """Phase 5: the example question gets a ranked answer from local data."""
    page.fill("#ask-input", "districts in Gujarat with the fewest generic stores per person")
    page.press("#ask-input", "Enter")
    page.wait_for_function("document.querySelector('#answer').innerText.includes('lowest')", timeout=15000)
    first = page.inner_text("#answer ol li")
    assert "Dohad" in first, f"Phase 5: expected Dohad first, got {first!r}"
    assert page.eval_on_selector("#metric", "el => el.value") == "kendras_per_lakh", "Phase 5: map colour did not switch"
    page.fill("#ask-input", "blah blah")
    page.press("#ask-input", "Enter")
    page.wait_for_function("document.querySelector('#answer').innerText.includes('Try one of these')", timeout=15000)
    page.screenshot(path=f"docs/images/{name}-ask.png")


def world_view(page, name):
    """Phase 9: another country opens with its regions, ranking and switch."""
    p2 = page.context.browser.new_page(viewport=page.viewport_size)
    errors = []
    p2.on("pageerror", lambda e: errors.append(str(e)))
    p2.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    from browser_check import stub_outside
    p2.route("**/*", stub_outside)
    p2.goto(page.url.split("?")[0] + "?country=nz", wait_until="networkidle")
    p2.wait_for_function("window.__ad && window.__ad.ready", timeout=30000)
    assert p2.get_attribute(".tabs button[aria-selected=true]", "data-code") == "nz", "country tab not set"
    assert "New Zealand" in p2.inner_text("#crumbs"), "country title missing"
    assert p2.inner_text("#ranking").count("\n") >= 3, "country ranking missing"
    p2.screenshot(path=f"docs/images/{name}-nz.png")
    p2.close()
    assert not errors, "; ".join(errors)


STEPS = [("district detail", district_detail), ("layer switches", layer_switches), ("medicine panel", medicine_panel), ("ask box", ask_box), ("world view", world_view)]
