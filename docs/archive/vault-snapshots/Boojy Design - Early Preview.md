> **📦 Vault snapshot — archived 2026-05-29.** Original design note from the Obsidian vault (last edited 2025-11-30). It captures historical *intent* for Boojy Design and predates the current build; the shipped code has since moved past it. Treat the code, README.md, FEATURES.md, and CHANGELOG.md as source of truth. The vault original is left in place.

---

# Boojy Design - Early Preview Design Document

> **Seamless pixel + vector design tool for students, hobbyists, and creators**

---

## Overview

Photo editing and vector design tool combining Photoshop + Illustrator + Affinity Designer capabilities in one seamless app. Built for students, hobbyists, and amateurs who need professional results without the complexity or cost.

**Replaces:**

- Photoshop (photo editing)
- Illustrator (vector design)
- Affinity Designer (unified workflow)
- Canva Pro (with more power and flexibility)

**Target Audience:**

- Students (school projects, presentations, posters)
- Hobbyists (YouTube thumbnails, social media graphics)
- Amateurs (small business flyers, logos, personal art)
- Budget-conscious creators (can't afford subscriptions)

**Core Philosophy:**

- **No mode switching** – Seamless pixel + vector workflow in one workspace
- **Smart layer system** – Auto-creates layers, drag to merge, non-destructive by default
- **Context-aware UI** – Top bar shows relevant options based on selection
- **Just works** – Smart defaults, minimal setup, intuitive tools

---

## The 12 Essential Tools

**Navigation & Selection:**

1. **Move (V)** – Select and move layers; click path outline to edit bezier points
2. **Selection (M)** – Rectangle/Ellipse selection for pixel areas
3. **Lasso (L)** – Freehand selection (trace around irregular shapes)

**Vector Tools:** 4. **Rectangle/Ellipse (R/O)** – Draw vector shapes with fill and stroke 5. **Pen (P)** – Draw bezier curves; click existing paths to edit anchor points

**Pixel Tools:** 6. **Brush (B)** – Paint on raster layers with pressure sensitivity 7. **Eraser (E)** – Erase pixels (destructive editing) 8. **Crop (C)** – Crop images or resize canvas

**Utilities:** 9. **Text (T)** – Add editable text with formatting 10. **Eyedropper (I)** – Pick colors from canvas 11. **Hand (H)** – Pan canvas 12. **Zoom (Z)** – Zoom in/out

**Why 12 tools:**

- Covers 90% of hobbyist use cases
- Learnable in one session
- Not overwhelming (vs Photoshop's 50+ tools)
- Each tool has clear, single purpose

---

## Smart Layer System

### Auto-Create Layers (Default Behavior)

```
Import photo → Creates "screenshot" layer 🖼️
Draw rectangle → Creates "Rectangle" layer 📐
Add text → Creates "TOP 10 TIPS" layer 🔤
Paint with brush → Creates "Brush" layer 🖼️
Draw circle → Creates "Ellipse" layer 📐
```

**Each tool automatically creates appropriate layer type**

### Drag-to-Merge (Flexible Organization)

```
Initial state:
  📐 Ellipse
  📐 Rectangle
  🔤 TOP 10 TIPS
  🖼️ screenshot

User drags "Ellipse" onto "Rectangle":
  📐 Rectangle (contains both shapes)
    ├─ Rectangle
    └─ Ellipse
  🔤 TOP 10 TIPS
  🖼️ screenshot
```

**Benefits:**

- Clean by default (separate layers, organized)
- Flexible when needed (merge to reduce clutter)
- Non-destructive (can always separate again)
- Visual feedback (highlight shows merge target)

### Smart Painting Behavior

**Scenario A: No layer selected**

```
User picks Brush → Starts painting
→ Auto-creates new layer "Brush" 🖼️
→ Non-destructive (separate from other content)
```

**Scenario B: Image layer selected**

```
User clicks "screenshot" layer → Picks Brush → Paints
→ Merges with screenshot pixels (destructive)
→ User explicitly chose to paint on that layer
```

**Result: Default is non-destructive, explicit selection allows merging**

---

## Context-Aware UI

Top bar adapts to show relevant options:

### Vector Shape Selected

```
Fill: [■ Blue ▼]  Stroke: [□ Black ▼]  Width: [2px]  Corner: [0px]  [Align ▼]
```

### Text Layer Selected

```
Font: [Helvetica ▼]  Size: [24px]  [B I U]  Align: [≡]  Color: [■]  Spacing: [0]
```

### Image Layer Selected

```
Brightness: [slider]  Contrast: [slider]  Saturation: [slider]  Temperature: [slider]
```

### Multiple Layers Selected

```
[Align Left] [Align Center] [Align Right] [Distribute ▼] [Group] [Merge]
```

**User never sees irrelevant options – UI stays clean and focused**

---

## Feature List

### ✅ Vector Tools

**Shape Creation:**

- Rectangle (with rounded corners slider)
- Ellipse/Circle
- Polygon (3-12 sides)
- Star (customizable points)
- Line tool
- Pen tool (bezier paths)

**Shape Properties:**

- Fill: Solid color, Linear gradient, Radial gradient, None
- Stroke: Solid color, width (1-50px), style (solid/dashed)
- Opacity: 0-100%
- Corner radius (rectangles)

**Path Editing:**

- Add/delete anchor points
- Convert corner ↔ curve
- Adjust bezier handles
- Edit with Move tool (context-aware):
    - Click shape fill → Move whole shape
    - Click shape outline → Show anchor points, edit paths

**Transform:**

- Visual bounding box with handles
    - Corner handles: Scale
    - Top handle: Rotate
- Move, scale, rotate, flip
- Numerical inputs (precise control)

### ✅ Pixel Tools

**Import & Basic Edits:**

- Import images (.jpg, .png, .tiff, .webp)
- Drag-and-drop support
- Auto-fit to canvas (with undo to restore original size)
- Crop tool (freeform + aspect ratio presets: 16:9, 1:1, 4:3)
- Rotate (90° increments + free rotation)
- Resize (maintain aspect ratio toggle, smart scaling)
- Flip horizontal/vertical

**Color Adjustments (Live Preview):**

- Brightness slider (-100 to +100)
- Contrast slider (-100 to +100)
- Saturation slider (-100 to +100)
- Temperature slider (warm/cool)
- Exposure adjustment
- Vibrance (intelligent saturation boost)
- Hue shift

**Painting:**

- Brush tool with pressure sensitivity
- Size: 1-500px
- Opacity: 0-100%
- Blend modes: Normal, Multiply, Screen, Overlay, Add
- Eraser tool (destructive pixel removal)
- Size and opacity controls

**Selections:**

- Rectangle/Ellipse selection
- Lasso (freehand tracing)
- Selection operations:
    - Delete pixels (press Delete key)
    - Move selected pixels (drag with Move tool)
    - Fill selection (click Fill button in top bar)
    - Clear selection (Escape key)
- Selection modifiers:
    - Shift+drag: Add to selection
    - Alt+drag: Subtract from selection

### ✅ Text Tools

**Text Creation:**

- Single-line text (click and type)
- Paragraph text boxes (click-drag to create box)
- System font support (all installed fonts)

**Formatting:**

- Font family dropdown
- Size: 6-300pt
- Style: Bold, Italic, Underline
- Alignment: Left, Center, Right, Justify
- Color picker (with recent colors)
- Character spacing (tracking)
- Line height

**Text Effects (via Layer Effects):**

- Drop shadow (offset, blur, opacity, color)
- Stroke outline (width, color)

### ✅ Layer System

**Layer Types:**

- Image layers (raster content)
- Vector shape layers
- Text layers
- Groups (merge multiple layers)

**Layer Operations:**

- Unlimited layers (50 layer limit for Preview – performance cap)
- Create, duplicate, delete, rename
- Opacity: 0-100%
- Blend modes: Normal, Multiply, Screen, Overlay, Add
- Lock/unlock (prevent editing)
- Show/hide (visibility toggle)
- Reorder (drag to rearrange)
- Merge layers (destructive – creates single combined layer)
- Group layers (non-destructive – drag layers into each other)

**Layer Panel Features:**

- Icons show content type: 🖼️ (pixels) 📐 (vector) 🔤 (text)
- Expandable groups (click arrow to see contents)
- Multi-select (Shift+click in layers panel)
- Thumbnails (visual preview of layer content – v1.0 feature)

**Layer Effects:**

- Drop shadow (offset X/Y, blur, opacity, color)
- Stroke outline (width, color, position: outside/inside/center)

### ✅ Alignment & Distribution

**When multiple layers selected:**

- Align: Left, Center, Right, Top, Middle, Bottom
- Distribute: Horizontal spacing, Vertical spacing
- Smart guides (show when objects align – v1.0 feature)

### ✅ Transform & Arrange

**Transform:**

- Move (drag or arrow keys)
- Scale (drag corner handles or numeric input)
- Rotate (drag rotation handle or numeric input)
- Flip horizontal/vertical
- Lock aspect ratio toggle

**Arrange:**

- Bring to front / Send to back
- Bring forward / Send backward
- Lock position (prevent accidental moves)

### ✅ Color System

**Color Picker:**

- Color wheel (hue selection)
- Saturation/Value square
- Swatch palette (12-24 common colors)
- Recent colors (automatically tracked)
- Eyedropper tool (pick from canvas)
- Hex input (#RRGGBB)
- RGB sliders (v1.0 feature)

**Gradients:**

- Linear gradient (2 colors, adjustable angle)
- Radial gradient (2 colors, adjustable center)
- Apply to shape fills
- Gradient editor (v1.0: multi-stop gradients)

### ✅ Project Management

**Save/Load:**

- Save project (.design format – preserves layers, vectors, text, editability)
- Auto-save every 90 seconds (to temp/cache location)
- Subtle notification: "Auto-saved ✓" (fades after 2 seconds)
- Prompt on close if unsaved: "Save changes?" [Save] [Don't Save] [Cancel]

**Cloud Sync:**

- Save to Boojy Cloud (optional)
- Auto-syncs every 90 seconds when Cloud-connected
- Notification: "Synced to Cloud ✓"
- Access from web dashboard (view projects, download)
- Cross-device sync (work on desktop, view on iPad)

**Export:**

- Format: PNG, JPG, PDF, SVG (vectors only)
- Smart defaults:
    - PNG: High quality, transparency on
    - JPG: High quality, no transparency
    - SVG: Vectors and text only (pixels excluded)
    - PDF: Mixed content (vectors as vectors, pixels embedded)
- Quality slider (Low/Medium/High for raster formats)
- DPI options: 72 (screen), 300 (print), custom
- Export dialog shows [More Options] for advanced settings
- Auto-suggests filename based on canvas preset
- Export flattens all layers to single image

**Undo/Redo:**

- Unlimited undo/redo (Ctrl+Z / Ctrl+Shift+Z)
- Works seamlessly across pixel edits, vector creation, layer operations
- Undo buttons visible in top bar: [↶ Undo] [↷ Redo]
- No visible history panel in Preview (keep it simple)
- History panel in v1.0 (optional, for power users)

---

## What's NOT in Preview

**Will be added in v0.5 or v1.0:**

### Advanced Masking

❌ Layer masks (non-destructive hide/reveal)  
❌ Clipping masks (content confined to shape)  
❌ Vector masks

### Advanced Color Correction

❌ Curves (precise tone control)  
❌ Levels (histogram-based adjustments)  
❌ HSL sliders (hue/saturation/luminance per color)  
❌ Color balance  
❌ Selective color

### Advanced Filters

❌ Blur (Gaussian, motion, radial)  
❌ Sharpen (unsharp mask, smart sharpen)  
❌ Noise (add/reduce grain)  
❌ Artistic filters (oil paint, watercolor)

### Advanced Selection

❌ Magic Wand (color-based selection)  
❌ Quick Selection (brush-based)  
❌ Refine Edge (hair, fur, complex edges)  
❌ Select by color range

### Photo Retouching

❌ Clone stamp (copy pixels from one area to another)  
❌ Healing brush (blend repairs seamlessly)  
❌ Patch tool (content-aware fill)  
❌ Red-eye removal

### Advanced Vector

❌ Path text (text follows curved path) – **v0.5**  
❌ Gradient mesh (complex color transitions)  
❌ Gradient on stroke (not just fill)  
❌ Pathfinder operations (unite, subtract, intersect)

### Advanced Text

❌ Text on path (curved text) – **v0.5**  
❌ Character styles (save formatting presets)  
❌ Paragraph styles  
❌ Vertical text  
❌ Text wrap around objects

### File Format Support

❌ Import .psd (Photoshop files) – **v1.0 priority**  
❌ Import .ai (Illustrator files) – **v1.0 priority**  
❌ Import .afdesign (Affinity files) – **v1.0**  
❌ RAW photo support (CR2, NEF, ARW) – **v1.5**

### Automation

❌ Actions/macros (record and replay steps)  
❌ Batch processing (apply edits to multiple files)  
❌ Scripts

### Extensions

❌ Plugin system – **Consider after v1.0**  
❌ Custom brushes marketplace  
❌ Third-party filters  
❌ Community extensions

**These are intentionally skipped to:**

- Keep Preview simple and focused
- Avoid overwhelming beginners
- Ship faster (fewer features = less to build/test)
- Validate core workflow first

---

## Workflow Example: YouTube Thumbnail

**10-step walkthrough demonstrating pixel + vector + text integration:**

### Step 1: Create New Document

```
File → New
→ Preset picker appears
→ Select "YouTube Thumbnail (1280×720)"
→ [Create]
→ Blank canvas with one empty layer
```

### Step 2: Import Screenshot

```
Drag "screenshot.png" onto canvas
→ Auto-scales to fit 1280×720
→ Creates Layer 1: "screenshot" 🖼️
→ Layer contains pixel content (the photo)
```

### Step 3: Crop to Focus

```
Press C (Crop tool)
Drag crop handles to focus on face
Press Enter to apply
→ Screenshot cropped, layer updated
```

### Step 4: Adjust Brightness

```
Layer "screenshot" selected
Top bar shows: Brightness slider (live preview as you drag)
Drag slider to +20
→ Photo brightens in real-time
```

### Step 5: Draw Background Rectangle

```
Press R (Rectangle tool)
Draw rectangle at bottom third of canvas (for text background)
→ Auto-creates Layer 2: "Rectangle" 📐
→ Rectangle auto-selected (blue outline visible)
→ Top bar shows: Fill [color] Stroke [color] Width [px]
```

### Step 6: Style Rectangle

```
Rectangle still selected from Step 5
Top bar: Click Fill color → Choose black
Top bar: Opacity slider → Set to 70%
Top bar: Stroke → Set to None
→ Semi-transparent black rectangle for text background
```

### Step 7: Add Text

```
Press T (Text tool)
Click on black rectangle area
Type "TOP 10 TIPS"
→ Auto-creates Layer 3: "TOP 10 TIPS" 🔤
→ Text auto-selected (cursor visible)
→ Top bar shows: Font [dropdown] Size [px] [B I U] Color [picker]
```

### Step 8: Style Text

```
Text still selected
Top bar: Font → Choose bold sans-serif (e.g., "Helvetica Bold")
Top bar: Size → 72px
Top bar: Color → White
Top bar: Alignment → Center
→ Large, bold white text on dark background
```

### Step 9: Add Decorative Circle

```
Press O (Ellipse tool)
Hold Shift, drag to create perfect circle in top-right corner
→ Auto-creates Layer 4: "Ellipse" 📐
→ Top bar: Fill → Yellow
→ Top bar: Stroke → None
→ Bright accent shape

Optional: Drag "Ellipse" layer onto "Rectangle" layer
→ Both shapes now in one layer (cleaner organization)
```

### Step 10: Paint Arrow (Optional Detail)

```
Option A (Non-destructive – default):
  Press B (Brush tool)
  Choose red color, size 20px
  Paint arrow pointing at face
  → Auto-creates Layer 5: "Brush" 🖼️
  → Arrow on separate layer (can delete later)

Option B (Merge with screenshot):
  Click "screenshot" layer first (explicit selection)
  Press B (Brush tool)
  Paint arrow
  → Arrow merges with screenshot pixels (destructive)
  → User explicitly chose to paint on that layer
```

### Export

```
File → Export
Format: PNG
Quality: High
[Export]
→ Saves as "YouTube-Thumbnail.png"
→ Flattens all layers to single 1280×720 image
```

**Final layer structure (Option A):**

```
🖼️ Brush (red arrow)
📐 Rectangle (contains rectangle + circle merged)
🔤 TOP 10 TIPS
🖼️ screenshot (cropped, brightened)
```

**Time to complete: 5-10 minutes for beginners**

---

## Success Criteria

**What testers should be able to do:**

### ✅ Photo Editing

- Import photo, crop, adjust brightness/contrast/saturation
- Export as PNG/JPG for social media

### ✅ Graphic Design

- Create poster with shapes, text, and imported images
- Design simple logo with vector shapes and text
- Make YouTube thumbnail with photo + text + graphics

### ✅ Text Overlay

- Add formatted text to photos
- Create text with drop shadow or outline effect
- Align text properly with shapes

### ✅ Vector Editing

- Draw shapes (rectangles, circles, custom paths with Pen tool)
- Edit bezier curves (move anchor points, adjust handles)
- Change fill/stroke properties
- Create multi-shape designs

### ✅ Layer Management

- Organize layers (rename, reorder, group)
- Understand layer types (icons: 🖼️📐🔤)
- Merge layers when needed (reduce clutter)
- Use layer effects (drop shadow, stroke)

### ✅ Mixed Workflows

- Combine photo editing + vector shapes + text seamlessly
- No confusion about "modes" or layer types
- Export clean, usable files

**If testers struggle with:**

- ❌ Tool discovery (can't find the right tool)
- ❌ Layer organization (confused by layer system)
- ❌ Transform controls (can't scale/rotate intuitively)
- ❌ Context switching (confused when top bar changes)
- ❌ Export process (don't know how to save final image)

**→ These are UX problems to fix before v0.5**

---

## Future Improvements

### v0.5 Additions (Months 12-15)

✅ Path text (text follows curved path)  
✅ .psd file import (Photoshop compatibility)  
✅ .ai file import (Illustrator compatibility)  
✅ Magic Wand selection (color-based)  
✅ Gradient mesh (advanced color transitions)  
✅ Layer thumbnails in panel (visual preview)  
✅ Smart guides (alignment helpers)  
✅ Raise layer limit to 100

### v1.0 Features (Months 15-24)

✅ Layer masks (non-destructive hide/reveal)  
✅ Adjustment layers (reusable color corrections)  
✅ Curves and Levels (precise tone control)  
✅ Clone stamp / Healing brush (retouching)  
✅ Advanced filters (blur, sharpen, noise)  
✅ History panel (undo timeline visualization)  
✅ RGB/HSL sliders (advanced color control)  
✅ Multi-stop gradients (3+ colors)  
✅ .afdesign import (Affinity compatibility)  
✅ Pathfinder operations (unite, subtract, intersect shapes)  
✅ Character/paragraph styles (save text presets)

### v1.5+ Features (Months 24-36)

✅ RAW photo support (CR2, NEF, ARW)  
✅ Batch processing (apply edits to multiple files)  
✅ Actions/macros (record and replay steps)  
✅ Advanced selections (Refine Edge, Select by Color Range)  
✅ Text wrap around objects  
✅ Gradient on stroke  
✅ Vertical text

### v2.0 Considerations (Year 2+)

🤔 Plugin system (after v1.0, community-driven)  
🤔 Custom brushes marketplace (user-created brush packs)  
🤔 Third-party filter support  
🤔 Script/automation API  
🤔 Collaboration features (real-time editing, comments)

### Learning Resources (Build Over Time)

📚 Official tutorials (YouTube channel @Boojy – monthly devlogs starting Month 4)  
📚 Built-in video guides (launch v0.5)  
📚 Documentation site (boojy.org/docs – launch Month 10)  
📚 Community tutorials (encourage after v1.0 open-source)  
📚 Example projects (templates users can learn from)

### Performance & Optimization

⚡ Multi-threaded rendering (v1.0)  
⚡ GPU acceleration (v1.0 priority)  
⚡ Smarter auto-save (only save changed layers, not entire file)  
⚡ Cloud sync optimization (delta updates, not full file uploads)  
⚡ Remove 50 layer limit (v1.0, after optimization)

---

## Competitive Differentiation

### vs Photoshop

✅ Free (vs £66.49/month)  
✅ Simpler (12 tools vs 50+)  
✅ Seamless pixel+vector (vs awkward vector layers)  
✅ Not overwhelming (intuitive for beginners)  
❌ Fewer advanced features (acceptable trade-off for target audience)

### vs Affinity Designer

✅ Free (vs £70 one-time)  
✅ No mode switching (vs Pixel/Designer Personas)  
✅ Smarter layer system (auto-create, drag-to-merge)  
✅ More beginner-friendly (simpler UI)  
❌ Less mature (new vs 10+ years) – but will improve quickly

### vs Canva

✅ More powerful (full vector editing, bezier paths)  
✅ Desktop app (faster, no internet needed)  
✅ No feature restrictions (Canva locks features behind paywall)  
✅ Professional export (no watermarks, full quality)  
❌ Less template-focused (trade-off: more flexible, less hand-holding)

### vs Mobile Apps (PicsArt, Snapseed)

✅ Desktop precision (mouse/trackpad, not touch)  
✅ Vector support (shapes, pen tool)  
✅ Unlimited layers (mobile apps limit to 5-10)  
✅ Professional output (print-quality export)  
❌ Not mobile (but iPad version in v1.1)

**Unique position:**

- More powerful than Canva
- Simpler than Affinity
- Free unlike both
- Seamless pixel+vector unlike Photoshop

**Target sweet spot:**

- Students who can't afford Adobe
- Hobbyists who outgrew Canva
- Amateurs who find Affinity too complex
- Anyone who wants "just enough" power without the overwhelm

---

## Technical Implementation

### Smart Layer Data Structure

```javascript
Layer {
  id: string
  name: string
  type: "smart" // All layers are "smart" (can contain multiple content types)
  
  // Content (each optional)
  pixelContent: {
    imageData: ImageData | null
    brushStrokes: BrushStroke[] | null
  }
  
  vectorContent: {
    shapes: Shape[] | null  // Rectangle, Ellipse, Pen paths
    paths: Path[] | null
  }
  
  textContent: {
    blocks: TextBlock[] | null
  }
  
  // Properties
  opacity: number (0-100)
  blendMode: string ("normal" | "multiply" | "screen" | "overlay" | "add")
  visible: boolean
  locked: boolean
  
  // Hierarchy
  children: Layer[] | null  // For grouped/merged layers
  parent: Layer | null
  
  // Effects
  effects: {
    dropShadow: DropShadow | null
    stroke: StrokeEffect | null
  }
  
  // Transform
  transform: {
    x: number
    y: number
    scaleX: number
    scaleY: number
    rotation: number
  }
}
```

### Rendering Pipeline

```
For each visible layer (bottom to top):
  1. Apply transform (position, scale, rotation)
  2. Render pixel content (if exists)
  3. Render vector shapes (if exists)
  4. Render text (if exists)
  5. Apply layer effects (drop shadow, stroke)
  6. Apply blend mode
  7. Apply opacity
```

### Performance Optimizations

- **Layer limit:** 50 layers max in Preview (raise to 100+ in v1.0 after optimization)
- **Smart rendering:** Only re-render layers that changed
- **Viewport culling:** Skip rendering layers outside visible canvas
- **Performance mode:** Auto-reduce quality if FPS drops below 30
    - Lower anti-aliasing
    - Reduce shadow quality
    - Notification: "⚡ Performance Mode (rendering faster)"
- **Warning at 40+ layers:** "Canvas is slowing down. Merge some layers?"

---

**Built for creators, by creators. Free forever.**