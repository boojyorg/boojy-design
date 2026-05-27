import { describe, expect, it } from "vitest"
import { useThumbnailStore } from "@/editor/state/thumbnailStore"

describe("thumbnailStore", () => {
  it("stores and reads a layer's thumbnail", () => {
    useThumbnailStore.getState().setThumbnail("l1", "data:image/png;base64,AAAA")
    expect(useThumbnailStore.getState().cache.get("l1")).toBe("data:image/png;base64,AAAA")
  })

  it("replaces the Map on each set so subscribers re-render", () => {
    const before = useThumbnailStore.getState().cache
    useThumbnailStore.getState().setThumbnail("l1", "data:image/png;base64,BBBB")
    expect(useThumbnailStore.getState().cache).not.toBe(before) // new reference
  })

  it("clears every thumbnail", () => {
    useThumbnailStore.getState().setThumbnail("l1", "x")
    useThumbnailStore.getState().setThumbnail("l2", "y")
    useThumbnailStore.getState().clearThumbnails()
    expect(useThumbnailStore.getState().cache.size).toBe(0)
  })
})
