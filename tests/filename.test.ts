import { describe, expect, it } from "vitest"
import { toExportFilename } from "@/lib/filename"

describe("toExportFilename", () => {
  it("appends .png to a plain name", () => {
    expect(toExportFilename("Untitled")).toBe("Untitled.png")
  })

  it("falls back to Untitled for an empty/blank name", () => {
    expect(toExportFilename("")).toBe("Untitled.png")
    expect(toExportFilename("   ")).toBe("Untitled.png")
  })

  it("does not double the extension", () => {
    expect(toExportFilename("art.png")).toBe("art.png")
    expect(toExportFilename("art.PNG")).toBe("art.png")
  })

  it("trims surrounding whitespace", () => {
    expect(toExportFilename("  my art  ")).toBe("my art.png")
  })
})
