import { defineConfig, devices } from "@playwright/test"

// Visual-regression runner — DISTINCT from Vitest (the `pnpm test` gate). Vitest covers pure
// logic in jsdom where the Konva engine no-ops; this drives a real headless Chromium against a
// live `pnpm dev` so the engine actually paints, then diffs the canvas frame against a stored
// master PNG. Run with `pnpm test:visual`. Not wired into CI (needs a browser download + dev
// server) — it's a local pre-merge check for canvas/engine/visual changes, the same walkthrough
// CLAUDE.md mandates, just automated.
const PORT = 5173

export default defineConfig({
  testDir: "./tests/visual",
  // The drawing replay is coordinate-plotted off a fixed 1920×1080 layout (see UI_UX_SPEC.md);
  // the master PNGs are full-frame captures at that size. Pin it so coordinates stay valid.
  use: {
    ...devices["Desktop Chrome"],
    baseURL: `http://localhost:${PORT}`,
    // Pin AFTER the device preset so these win — the replay coordinates and the master PNGs are
    // both tied to a 1920×1080, DSF-1 (not Retina-doubled) frame.
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  },
  // Single worker / no retries: a pixel diff isn't flaky-by-timeout, and parallel dev-server
  // contention would only add noise.
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "./.playwright-screenshots/results", // gitignored scratch (diffs on failure).
  // Reuse Tyr's already-running localhost; only spawn `pnpm dev` if nothing is listening.
  webServer: {
    command: "pnpm dev",
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
