import functools
import http.server
import json
import os
from pathlib import Path
import threading
import unittest

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class MobileBrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = http.server.ThreadingHTTPServer(
            ("127.0.0.1", 0),
            functools.partial(QuietHandler, directory=str(ROOT / "site")),
        )
        cls.server_thread = threading.Thread(
            target=cls.server.serve_forever, daemon=True
        )
        cls.server_thread.start()
        cls.addClassCleanup(cls.server.server_close)
        cls.addClassCleanup(cls.server.shutdown)
        cls.playwright = sync_playwright().start()
        cls.addClassCleanup(cls.playwright.stop)
        browser_type = os.environ.get("INVANIM_TEST_BROWSER", "chromium")
        if browser_type not in ("chromium", "webkit"):
            raise ValueError("INVANIM_TEST_BROWSER must be chromium or webkit")
        cls.browser = getattr(cls.playwright, browser_type).launch()
        cls.addClassCleanup(cls.browser.close)
        cls.base_url = f"http://127.0.0.1:{cls.server.server_port}"

    def new_page(self, width=360, height=800, reduced_motion="no-preference"):
        context = self.browser.new_context(
            viewport={"width": width, "height": height},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
            reduced_motion=reduced_motion,
            service_workers="block",
        )
        self.addCleanup(context.close)
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        self.addCleanup(lambda: self.assertEqual(errors, []))
        return page

    def open_mobile(self, page, deep_link=False):
        suffix = "&id=PA_01" if deep_link else ""
        page.goto(f"{self.base_url}/mobile.html?tileset=none{suffix}")
        page.wait_for_function("animationState.ready")

    def test_phone_layout_and_long_city_banner(self):
        page = self.new_page()
        self.open_mobile(page)
        page.wait_for_function("animationState.nextIndex >= 2")
        page.evaluate("pauseAnimation()")
        page.locator("#animationStats").tap()
        page.evaluate("showCityBonusBanner('BAB')")
        page.wait_for_timeout(450)
        for width, height in [(320, 740), (360, 800), (390, 844), (430, 932), (844, 390)]:
            with self.subTest(viewport=(width, height)):
                page.set_viewport_size({"width": width, "height": height})
                page.wait_for_timeout(150)
                layout = page.evaluate("""() => {
                    const rect = id => {
                        const r = document.getElementById(id).getBoundingClientRect();
                        return {x:r.x, y:r.y, right:r.right, bottom:r.bottom,
                            width:r.width, height:r.height};
                    };
                    const banner = document.querySelector('.city-bonus-banner');
                    const b = banner && banner.getBoundingClientRect();
                    return {
                        stats:rect('animationStats'), nav:rect('infoBox'),
                        progress:rect('animationProgress'), slider:rect('progressSlider'),
                        banner:b && {x:b.x, right:b.right},
                        links:[...document.querySelectorAll('#infoBox a')]
                            .map(a => a.getBoundingClientRect().height),
                        overflow:document.documentElement.scrollWidth > innerWidth
                    };
                }""")
                self.assertLessEqual(layout["stats"]["bottom"], layout["nav"]["y"])
                self.assertLessEqual(layout["nav"]["bottom"], layout["progress"]["y"])
                self.assertLessEqual(layout["progress"]["bottom"], height)
                self.assertGreaterEqual(layout["slider"]["height"], 44)
                self.assertTrue(all(h >= 44 for h in layout["links"]))
                self.assertFalse(layout["overflow"])
                if layout["banner"]:
                    self.assertGreaterEqual(layout["banner"]["x"], 0)
                    self.assertLessEqual(layout["banner"]["right"], width)

    def test_sprites_are_small_bounded_and_land_once(self):
        page = self.new_page()
        self.open_mobile(page, deep_link=True)
        page.evaluate("""() => {
            startAnimation(getPAList().slice(0, 12), 'pa');
            window.maxCards = 0;
            window.maxCardSize = 0;
            window.landingErrors = [];
            document.getElementById('animationOverlay').addEventListener('animationend', e => {
                const r = e.target.getBoundingClientRect();
                const p = map.latLngToContainerPoint([+e.target.dataset.lat, +e.target.dataset.lng]);
                landingErrors.push(Math.hypot(r.x+r.width/2-p.x, r.y+r.height/2-p.y));
            }, true);
            window.cardSample = setInterval(() => {
                const cards = [...document.querySelectorAll('.animation-card')];
                maxCards = Math.max(maxCards, cards.length);
                for (const card of cards) maxCardSize = Math.max(maxCardSize, card.offsetWidth);
            }, 20);
        }""")
        page.wait_for_function(
            "!animationState.isPlaying && animationState.nextIndex === 12",
            timeout=20000,
        )
        result = page.evaluate("""() => {
            clearInterval(cardSample);
            return {maxCards, maxCardSize, landingErrors,
                completed:animationState.redSquares.length,
                cards:document.querySelectorAll('.animation-card').length,
                canvases:document.querySelectorAll('.completed-sprites').length};
        }""")
        self.assertLessEqual(result["maxCards"], 8)
        self.assertGreater(result["maxCards"], 1)
        self.assertLessEqual(result["maxCardSize"], 240)
        self.assertEqual(result["completed"], 12)
        self.assertEqual(result["cards"], 0)
        self.assertEqual(result["canvases"], 1)
        self.assertEqual(len(result["landingErrors"]), 12)
        self.assertLessEqual(max(result["landingErrors"]), 2)

    def test_running_menu_hides_and_stats_tap_reveals_without_pausing(self):
        page = self.new_page()
        self.open_mobile(page)
        page.wait_for_function("animationState.nextIndex >= 2")
        self.assertFalse(page.locator("#infoBox").is_visible())
        self.assertEqual(page.locator("#animationStats").get_attribute("aria-expanded"), "false")
        compact_height = page.locator("#mobileControls").bounding_box()["height"]
        page.locator("#animationStats").tap()
        self.assertTrue(page.locator("#infoBox").is_visible())
        self.assertTrue(page.evaluate("animationState.isPlaying"))
        self.assertGreaterEqual(
            page.locator("#mobileControls").bounding_box()["height"],
            compact_height + 44,
        )
        self.assertEqual(page.locator("#animationStats").get_attribute("aria-expanded"), "true")
        page.locator("#startAllAnimation").tap()
        self.assertTrue(page.evaluate("animationState.isPaused"))
        self.assertTrue(page.locator("#infoBox").is_visible())
        page.locator("#startAllAnimation").tap()
        self.assertTrue(page.evaluate("animationState.isPlaying"))
        self.assertFalse(page.locator("#infoBox").is_visible())

    def test_progress_tap_and_keyboard_reveal_preserve_seeking(self):
        page = self.new_page()
        self.open_mobile(page)
        page.wait_for_function("animationState.nextIndex >= 2")
        page.locator("#progressLabel").tap()
        self.assertTrue(page.locator("#infoBox").is_visible())
        self.assertTrue(page.evaluate("animationState.isPlaying"))
        page.locator("#startAllAnimation").tap()
        page.locator("#startAllAnimation").tap()
        self.assertFalse(page.locator("#infoBox").is_visible())
        slider = page.locator("#progressSlider")
        slider.tap(position={"x": slider.bounding_box()["width"] / 2, "y": 22})
        self.assertTrue(page.locator("#infoBox").is_visible())
        self.assertTrue(page.evaluate("animationState.isPlaying"))
        self.assertGreater(page.evaluate("animationState.nextIndex"), 1000)
        page.evaluate("pauseAnimation()")
        slider.focus()
        before = page.evaluate("animationState.nextIndex")
        slider.press("ArrowRight")
        self.assertEqual(page.evaluate("animationState.nextIndex"), before + 1)
        page.evaluate("resumeAnimation()")
        self.assertFalse(page.locator("#infoBox").is_visible())
        page.locator("#animationStats").focus()
        page.locator("#animationStats").press("Enter")
        self.assertTrue(page.locator("#infoBox").is_visible())
        self.assertTrue(page.evaluate("animationState.isPlaying"))
        page.evaluate("pauseAnimation(); resumeAnimation()")
        page.locator("#progressLabel").focus()
        page.locator("#progressLabel").press("Space")
        self.assertTrue(page.locator("#infoBox").is_visible())

    def test_camera_transitions_and_pause_cancellation(self):
        page = self.new_page()
        self.open_mobile(page, deep_link=True)
        page.evaluate("""() => {
            window.cameraMoving = false;
            window.spawnsDuringCamera = 0;
            window.offscreenLandings = 0;
            map.on('movestart', () => cameraMoving = true);
            map.on('moveend', () => cameraMoving = false);
            const update = updateStatsOverlay;
            updateStatsOverlay = (...args) => {
                if (cameraMoving) spawnsDuringCamera++;
                if (!isPositionVisible(getInvaderPosition(args[0]))) offscreenLandings++;
                update(...args);
            };
            animationState.animationSpeed = 400;
            startAnimation(['PA_01', 'PA_1234', 'PA_02', 'LDN_01', 'PA_03'], 'all');
        }""")
        page.wait_for_function(
            "!animationState.isPlaying && animationState.nextIndex === 5",
            timeout=20000,
        )
        self.assertEqual(page.evaluate("spawnsDuringCamera"), 0)
        self.assertEqual(page.evaluate("offscreenLandings"), 0)
        self.assertEqual(page.evaluate("animationState.redSquares.length"), 5)
        page.evaluate("clearRedSquares(); startAnimation(['LDN_01'], 'all')")
        page.wait_for_function("animationState.transitioning")
        page.evaluate("pauseAnimation()")
        center = page.evaluate("[map.getCenter().lat, map.getCenter().lng]")
        page.wait_for_timeout(1900)
        self.assertEqual(page.evaluate("[map.getCenter().lat, map.getCenter().lng]"), center)
        self.assertEqual(page.evaluate("animationState.nextIndex"), 0)
        self.assertFalse(page.evaluate("animationState.transitioning"))

    def test_artwork_failure_does_not_consume_entry_and_retries(self):
        page = self.new_page()
        page.route("**/*.avif", lambda route: route.abort())
        self.open_mobile(page)
        page.wait_for_function("animationState.isPaused")
        self.assertEqual(page.evaluate("animationState.nextIndex"), 0)
        self.assertTrue(page.locator("#retryAnimation").is_visible())
        self.assertIn("Could not load artwork", page.locator("#animationStatus").inner_text())
        page.unroute("**/*.avif")
        page.locator("#retryAnimation").click()
        page.wait_for_function("animationState.nextIndex > 0")
        self.assertFalse(page.locator("#retryAnimation").is_visible())

    def test_metadata_failure_is_visible_and_retryable(self):
        page = self.new_page()
        page.route("**/all_atlases.json", lambda route: route.fulfill(status=503, body="Unavailable"))
        page.goto(f"{self.base_url}/mobile.html?tileset=none")
        page.locator("#retryAnimation").wait_for(state="visible")
        self.assertFalse(page.evaluate("animationState.ready"))
        self.assertFalse(page.evaluate("animationState.isPlaying"))
        page.unroute("**/all_atlases.json")
        page.locator("#retryAnimation").click()
        page.wait_for_function("animationState.ready && animationState.nextIndex > 0")

    def test_storage_isolation_and_install_identity(self):
        page = self.new_page()
        page.add_init_script("""localStorage.setItem('collectedIds', '["PA_999"]');
            localStorage.setItem('tileset', 'satellite');""")
        self.open_mobile(page, deep_link=True)
        page.evaluate("onCollected('PA_01'); mobileStorage.setItem('tileset', 'none')")
        stored = page.evaluate("""() => ({
            original:localStorage.getItem('collectedIds'),
            mobile:localStorage.getItem('invanim-mobile:collectedIds'),
            tileset:localStorage.getItem('tileset')
        })""")
        self.assertEqual(json.loads(stored["original"]), ["PA_999"])
        self.assertEqual(json.loads(stored["mobile"]), ["PA_01"])
        self.assertEqual(stored["tileset"], "satellite")
        manifest = json.loads((ROOT / "site" / "mobile-manifest.json").read_text(encoding="utf-8"))
        self.assertEqual(manifest["start_url"], "./mobile.html")
        original = json.loads((ROOT / "site" / "manifest.json").read_text(encoding="utf-8"))
        self.assertNotEqual(manifest["id"], original["id"])

    def test_original_entry_keeps_original_assets_and_storage(self):
        page = self.new_page()
        page.add_init_script("""localStorage.setItem('collectedIds', '["PA_01"]');
            localStorage.setItem('invanim-mobile:collectedIds', '["PA_02"]');""")
        page.goto(f"{self.base_url}/index.html?tileset=none&id=PA_01")
        page.wait_for_function("Object.keys(invaders).length > 0")
        self.assertTrue(page.evaluate("collectedIds.has('PA_01')"))
        self.assertFalse(page.evaluate("collectedIds.has('PA_02')"))
        self.assertEqual(page.locator("#mobileControls").count(), 0)
        self.assertEqual(page.locator('script[src="map.js"]').count(), 1)
        self.assertEqual(page.locator('link[href="map.css"]').count(), 1)
        self.assertFalse(page.evaluate("animationState.isPlaying"))

    def test_settings_links_switch_both_versions_without_redirects(self):
        page = self.new_page()
        page.goto(f"{self.base_url}/index.html?tileset=none&id=PA_01")
        page.wait_for_function("Object.keys(invaders).length > 0")
        page.locator("#openSettings").click()
        page.locator('#settingsModal a[href="mobile.html"]').click()
        page.wait_for_url("**/mobile.html")
        page.wait_for_function("animationState.ready && animationState.nextIndex > 0")
        self.assertEqual(page.locator('script[src="mobile.js"]').count(), 1)
        page.locator("#animationStats").tap()
        page.locator("#openSettings").tap()
        page.locator('#settingsModal a[href="index.html"]').click()
        page.wait_for_url("**/index.html")
        page.wait_for_function("Object.keys(invaders).length > 0")
        self.assertEqual(page.locator('script[src="map.js"]').count(), 1)
        self.assertEqual(page.locator("#mobileControls").count(), 0)

    def test_seek_resize_settings_and_reduced_motion(self):
        page = self.new_page(reduced_motion="reduce")
        self.open_mobile(page)
        page.wait_for_function("animationState.nextIndex > 0")
        page.evaluate("pauseAnimation(); seekToIndex(1500)")
        self.assertEqual(page.evaluate("animationState.redSquares.length"), 1500)
        self.assertEqual(page.evaluate("document.querySelectorAll('.red-square-marker').length"), 0)
        page.set_viewport_size({"width": 844, "height": 390})
        page.wait_for_timeout(150)
        self.assertTrue(page.evaluate("animationState.isPaused"))
        self.assertEqual(page.evaluate("animationState.nextIndex"), 1500)
        page.evaluate("resumeAnimation()")
        page.wait_for_function("animationState.nextIndex > 1500")
        page.locator("#animationStats").tap()
        page.locator("#openSettings").click()
        self.assertTrue(page.evaluate("animationState.isPaused"))
        page.locator("#settingsCloseBtn").click()
        self.assertTrue(page.locator("#infoBox").is_visible())
        page.evaluate("resumeAnimation(); seekToIndex(animationState.animationList.length)")
        page.wait_for_function("!animationState.isPlaying")
        self.assertFalse(page.evaluate("animationState.transitioning"))

    def test_mobile_loads_artwork_on_demand_and_frames_paris(self):
        page = self.new_page()
        artwork_requests = set()
        page.on("request", lambda request:
                artwork_requests.add(request.url) if request.url.endswith(".avif") else None)
        self.open_mobile(page)
        page.wait_for_function("animationState.nextIndex >= 3")
        self.assertLessEqual(len(artwork_requests), 2)
        visible = page.evaluate("""() => {
            const bottom = document.getElementById('mobileControls').getBoundingClientRect().top;
            const paris = Object.values(invaders).filter(i => i.id.startsWith('PA_'));
            const visible = paris.filter(i => {
                const p = map.latLngToContainerPoint([i.obf_lat, i.obf_lng]);
                return p.x >= 0 && p.x <= innerWidth && p.y >= 0 && p.y < bottom;
            }).length;
            return {coverage:visible / paris.length, zoom:map.getZoom()};
        }""")
        self.assertGreaterEqual(visible["coverage"], 0.9)
        self.assertGreaterEqual(visible["zoom"], 11)

    def test_my_mode_uses_only_mobile_gallery_and_date_range(self):
        page = self.new_page(reduced_motion="reduce")
        self.open_mobile(page, deep_link=True)
        page.evaluate("""() => {
            mobileStorage.setItem('uid', 'test-gallery');
            mobileStorage.setItem('animFrom', '2026-10-02');
            mobileStorage.setItem('animTo', '2026-10-03');
            animationState.galleryData = {invaders:{
                PA_01:{date_flash:'2026-10-01',point:10},
                PA_02:{date_flash:'2026-10-02',point:20},
                PA_03:{date_flash:'2026-10-03',point:30}
            }};
        }""")
        page.locator("#startMyAnimation").click()
        page.wait_for_function("!animationState.isPlaying && animationState.nextIndex === 2")
        self.assertEqual(page.evaluate("animationState.mode"), "my")
        self.assertEqual(page.evaluate("animationState.animationList"), ["PA_02", "PA_03"])
        self.assertEqual(page.evaluate("animationState.cumulatedPoints"), 50)


if __name__ == "__main__":
    unittest.main()
