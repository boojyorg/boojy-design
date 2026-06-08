import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { expect, test } from "@playwright/test"
import pixelmatch from "pixelmatch"
import { PNG } from "pngjs"
import { drawSmiley } from "./draw-smiley"

// Visual regression: replay the smiley-face composition live, then diff the resulting frame
// against the committed master. A pass means the engine still paints the same multi-tool result
// (Shape→Ellipse + brush eyes/smile, composited over layers). See tests/UI_UX_SPEC.md.
//
// The capture is scoped to the `canvas-stage` ELEMENT (centre editor column), not the whole
// viewport — so a toolbar/panel restyle outside the canvas can't break this test. The master is a
// canvas-only PNG; regenerate it with `UPDATE_MASTER=1 pnpm test:visual` after an intentional
// canvas change (review the new PNG before committing).

const MASTER = fileURLToPath(new URL("../visual-snapshots/smiley-face-master.png", import.meta.url))
const DIFF_OUT = fileURLToPath(
  new URL("../../.playwright-screenshots/smiley-face-diff.png", import.meta.url),
)
const UPDATE_MASTER = Boolean(process.env.UPDATE_MASTER)

// Tolerance: allow <1% of pixels to differ. pixelmatch's per-pixel `threshold` (0–1) absorbs
// anti-aliasing jitter so only genuine pixel changes count toward the ratio.
const MAX_DIFF_RATIO = 0.01
const AA_THRESHOLD = 0.1

test("smiley-face composition matches the stored master within 1%", async ({ page }) => {
  const canvas = await drawSmiley(page)

  // Element-scoped capture (canvas column only). PNG buffer; on the happy path nothing is written
  // to disk — we persist a diff only on failure, or overwrite the master under UPDATE_MASTER.
  const shotBuf = await canvas.screenshot()

  if (UPDATE_MASTER) {
    writeFileSync(MASTER, shotBuf)
    test.info().annotations.push({ type: "update-master", description: MASTER })
    return
  }

  const shot = PNG.sync.read(shotBuf)
  const master = PNG.sync.read(readFileSync(MASTER))

  expect(
    { width: shot.width, height: shot.height },
    "live capture must match the master's dimensions before diffing",
  ).toEqual({ width: master.width, height: master.height })

  const { width, height } = master
  const diff = new PNG({ width, height })
  const mismatched = pixelmatch(master.data, shot.data, diff.data, width, height, {
    threshold: AA_THRESHOLD,
  })
  const ratio = mismatched / (width * height)

  if (ratio >= MAX_DIFF_RATIO) {
    writeFileSync(DIFF_OUT, PNG.sync.write(diff))
  }

  expect(
    ratio,
    `pixel-diff ratio ${(ratio * 100).toFixed(3)}% exceeded the 1% budget ` +
      `(${mismatched}/${width * height} px). Diff written to ${DIFF_OUT}.`,
  ).toBeLessThan(MAX_DIFF_RATIO)
})
