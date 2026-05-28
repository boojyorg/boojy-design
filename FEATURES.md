# Boojy Design — feature tour

A look at what Boojy Design is and what you can do in it, without having to run it.
Boojy is a **web image editor** built on a familiar "Classic" layout: a top bar, a left tool
rail, the canvas in the middle, and a layers sidebar on the right. If you've used Photoshop,
Figma, or GIMP, you already know where everything is.

> **Status: v0.4.0 — the core editor is complete.** Paint, shapes, fill, layers, transform,
> selection, live text, undo/redo, and save/open all work. See [What's next](#whats-next) for
> where it's headed.

---

## The layout at a glance

```
┌─ Boojy Design ───────────────────────────── [Save] [Export] [↩ ↪] ─┐
│     │                                               │  Layers       │
│ [▢] │                                               │ ┌───────────┐ │
│ [✎] │                                               │ │ T  Title  │ │  ← live text layer
│ [⌫] │                                               │ ├───────────┤ │
│ [⬚] │                                               │ │ ▦  Layer 1│ │  ← active layer
│ [◧] │                  ( your canvas )              │ ├───────────┤ │
│ [⊹] │                                               │ │ 🔒 Backgrnd│ │  ← locked white base
│ [↔] │                                               │ └───────────┘ │
│ [T] │                                               │  Opacity ──●── │
│     │                                               │               │
└─────┴───────────────────────────────────────────────┴───────────────┘
  tool rail            canvas                              sidebar

  ▢ marquee   ✎ brush   ⌫ eraser   ⬚ shape   ◧ fill   ⊹ eyedropper   ↔ move   T text
```

- **Top bar** — save / open / export, undo / redo, and tool-specific controls (e.g. Flip H/V
  appear here while a selection is active).
- **Tool rail** — every tool, one click away, each with a keyboard shortcut.
- **Canvas** — the editable page; pan and zoom freely.
- **Sidebar** — the layer stack with live thumbnails, plus per-layer opacity and (for text
  layers) font controls.

---

## What you can do

Legend:  ✅ shipped   🔜 next milestone   💭 deferred / later

| Feature | What it does for you | Status |
| --- | --- | :---: |
| **Brush & eraser** | Paint in any colour with adjustable size, hardness, and opacity. Hold **Shift** for a straight line snapped to 45°. | ✅ |
| **Fill bucket** | Flood-fill an area with a tolerance slider; fills *behind* anti-aliased edges so you don't get an ugly fringe. | ✅ |
| **Eyedropper** | Click to sample any colour on the canvas into your foreground, then snap back to your last tool. | ✅ |
| **Colours** | Foreground + secondary swatches. **X** swaps them, **D** resets to black/white. | ✅ |
| **Shapes** | Drag out a filled rectangle or ellipse (**Shift** = perfect square/circle). | ✅ |
| **Text** | Click to place a text layer and type directly on the canvas. Stays editable forever — adjust font size and colour anytime; never gets "baked" into pixels. | ✅ |
| **Move / transform** | An 8-handle box to scale, rotate, and move any layer. Drag a handle past the far edge to mirror it. Pixels never move in their buffer until you flatten. | ✅ |
| **Layers** | Add, reorder by dragging, rename, duplicate (with pixels), delete, hide, and set opacity — each with a live thumbnail. | ✅ |
| **Marquee select** | Drag a rectangle to select; copy / cut / delete / paste-as-new-layer; flip in place; or drag the selection to lift it onto its own layer. | ✅ |
| **Undo / redo** | One unified history across *everything* — brush strokes and layer operations alike, including undo-ing a delete with pixels intact. | ✅ |
| **Save / open / export** | Save editable `.design` files, open them back up, import images, and export a flattened PNG. | ✅ |
| **Navigation** | Scroll to pan, pinch / ⌘-scroll to zoom toward the cursor, Space-drag to pan, fit / 100% shortcuts. | ✅ |
| **Text formatting** | Font-family picker, alignment, and multi-line wrapping. | 🔜 |
| **Blend modes** | Per-layer multiply / screen / overlay etc. | 🔜 |
| **Paint masking** | Constrain brush / fill / eraser to the active selection. | 🔜 |
| **Lasso & gradients** | Freehand selection, gradient fills, tiling for large documents, skew. | 💭 |

---

## A closer look — the headline tools

### ✎ Brush, eraser & fill

Raster painting in any colour. Size, hardness, and opacity are all live, and a zoom-aware cursor
ring shows your exact brush footprint. The fill bucket composites *under* soft edges so flat fills
never leave a halo.

```
   ╭───────────╮          Shift-drag = straight line, snapped to 45°
   │  ·∙●∙·     │ ← soft brush
   │     ╲      │              ●──────────────────●
   │      ╲     │
   │       ●    │ ← hard brush
   ╰───────────╯
```

### ↔ Move & free transform

Select a layer and a transform box appears: drag corners to scale (hold **Shift** to keep
proportions), edges for one axis, the top grip to rotate (snaps every 15°), or inside the box to
move. Drag any handle clean past the opposite side and the layer **mirrors**. Crucially, this is
non-destructive — the pixels stay put in their buffer until you actually flatten or export.

```
        ◌  ← rotate grip
        │
   □────□────□
   │         │
   □  layer  □     corners = scale · edges = one axis · inside = move
   │         │     drag past the far edge → mirror
   □────□────□
```

### ▢ Marquee selection

Drag a rectangle and marching ants track your selection. From there: **⌘C** copy, **⌘X** cut,
**⌫** delete, **⌘V** paste as a new layer, or **Flip H/V** in place. Or just drag *inside* the
selection to lift those pixels onto a brand-new floating layer at the drop point — it even
switches you to the Move tool with handles ready.

```
   ╔═ ═ ═ ═ ═ ═╗   ← marching ants
   ║           ║
   ║ selected  ║   ⌘C copy · ⌘X cut · ⌫ delete · ⌘V paste
   ║ region    ║   drag inside → float onto its own layer
   ╚═ ═ ═ ═ ═ ═╝
```

### T Live text

Pick the Text tool, click the canvas, and type — the text appears live on the canvas, not in a
dialog. It stays editable forever: click it again (or double-click from any tool) to change the
words, and use the sidebar to set font size and colour. Because text is stored as text (not
flattened to pixels), `.design` files keep it editable, and PNG export renders it crisply.

```
   ┌─────────────────────────┐
   │  Hello, Boojy▏          │  ← caret; type directly on canvas
   └─────────────────────────┘
        sidebar: [ Size 48 ▾ ]  [ ■ colour ]
```

---

## What's next

The roadmap is sequenced deliberately — the editor shipped an intentionally tight feature set
first, and new capabilities slot in one milestone at a time.

```
  ✅ SHIPPED ───────────────────────────────────────────────┐
     paint · fill · eyedropper · shapes · text · transform   │
     layers + opacity · marquee · undo/redo · save/open       │
                                                              │
  🔜 NEXT ─────────────────────────────────────────────────┤
     text formatting (fonts · alignment · multi-line)         │
     blend modes (per-layer)                                  │
     paint masking within a selection                         │
                                                              │
  💭 LATER ────────────────────────────────────────────────┘
     lasso selection · gradients · tiling for big docs · skew
```

Under the hood, the next engineering milestones are internal refactors (splitting the largest
canvas modules) rather than features — they keep the codebase easy to extend as the feature list
above grows.

---

*For the full release history see [CHANGELOG.md](./CHANGELOG.md); for architecture and how to run
it locally see [README.md](./README.md).*
