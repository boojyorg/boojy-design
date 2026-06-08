import type { Locator, Page } from "@playwright/test"

// Deterministic replay of the multi-tool "smiley face" composition documented in
// tests/UI_UX_SPEC.md → "Verified interaction loop — multi-tool composition". Reproducing the
// exact authored coordinate sequence (rendering is deterministic given identical input) is what
// lets us diff against the stored smiley-face-master.png. Konva listens to real pointer events,
// so every draw action goes through page.mouse.{move,down,up}, NOT element clicks/drags.
//
// All coordinates are absolute viewport pixels from the 1920×1080 / 75%-fit capture. They are
// load-bearing: they only line up because playwright.config pins that exact viewport.

const SETTLE_MS = 120

/** A discrete brush dot. A zero-distance down→up can fail to register, so nudge 1px first. */
async function stamp(page: Page, x: number, y: number) {
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 1, y + 1, { steps: 2 })
  await page.mouse.up()
}

/**
 * Replays the smiley composition and returns the `canvas-stage` element locator — the centre
 * editor column (the Konva host + grid, between the rails, below the top bar). Callers screenshot
 * *that element*, not the whole viewport, so chrome churn (toolbar/panel restyles) can't move the
 * pixels under regression. The replay coordinates are still viewport-absolute, so this only lines
 * up at the pinned 1920×1080 viewport.
 */
export async function drawSmiley(page: Page): Promise<Locator> {
  await page.goto("/")
  // Wait for the engine's stage to mount before plotting any coordinates against it.
  const canvas = page.getByTestId("canvas-stage")
  await canvas.waitFor({ state: "visible" })
  await page.waitForTimeout(300) // let fit-to-screen settle to 75%.

  // 1. Face — Shape → Ellipse, dragged bbox (694,416)→(994,716) in default amber on Layer 1.
  await page.getByRole("button", { name: "Shape (R)" }).click()
  await page.getByRole("button", { name: "Ellipse", exact: true }).click()
  await page.mouse.move(694, 416)
  await page.mouse.down()
  await page.mouse.move(994, 716, { steps: 24 })
  await page.mouse.up()
  await page.waitForTimeout(SETTLE_MS)

  // 2. New layer for the features (inserts above Layer 1, auto-selected).
  await page.getByRole("button", { name: "Add layer" }).click()
  await page.waitForTimeout(SETTLE_MS)

  // 3. Switch to Paint and set the foreground to near-black (#161616) via the rail swatch popover.
  await page.getByRole("button", { name: "Paint (B)" }).click()
  // Two swatches carry this label (top-bar quick-params + the rail); use the rail one.
  await page
    .getByRole("navigation", { name: "Tools" })
    .getByRole("button", { name: "Foreground color" })
    .click()
  const hex = page.getByRole("textbox", { name: "Hex color" })
  await hex.click()
  await hex.press("ControlOrMeta+a")
  await hex.pressSequentially("161616")
  await hex.press("Enter")
  await page.keyboard.press("Escape") // dismiss the popover so it doesn't overlay the canvas.
  await page.waitForTimeout(SETTLE_MS)

  // 4. Eyes — two discrete stamps symmetric about x=844, above centre.
  await stamp(page, 794, 516)
  await stamp(page, 894, 516)
  await page.waitForTimeout(SETTLE_MS)

  // 5. Smile — a 25-point upward U traced as one continuous drag. Ends (764,600) & (924,600),
  //    vertex (844,660); y = 660 − 60·t² for t ∈ [−1, 1], x sweeps 764→924 linearly.
  const POINTS = 25
  const pt = (i: number) => {
    const t = -1 + (2 * i) / (POINTS - 1)
    return { x: 764 + 80 * (t + 1), y: 660 - 60 * t * t }
  }
  const first = pt(0)
  await page.mouse.move(first.x, first.y)
  await page.mouse.down()
  for (let i = 1; i < POINTS; i++) {
    const p = pt(i)
    await page.mouse.move(p.x, p.y, { steps: 2 })
  }
  await page.mouse.up()

  // 6. Park the cursor off-canvas so the live brush hover-ring doesn't leak into the capture.
  await page.mouse.move(1750, 750)
  await page.waitForTimeout(250)

  return canvas
}
