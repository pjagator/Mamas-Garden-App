# Aesthetic Redesign: "The Botanical Journal"

A comprehensive UI overhaul of Mama's Garden App, elevating it from functional to world-class. Inspired by Jony Ive's design philosophy — reduction to essence, obsessive detail, quiet confidence — combined with the warmth and personality of apps like Headspace and Calm.

## Design Philosophy

- **Reduction**: Remove everything that isn't essential until the design feels inevitable
- **Material honesty**: Surfaces, shadows, and depth feel real and purposeful
- **Quiet confidence**: The interface doesn't shout; it's calm, assured, serene
- **Literary identity**: The app reads like a beautifully typeset botanical field guide, not a database
- **Organic motion**: Nothing snaps; everything flows with weight and intention

## 1. Navigation Restructure

### Current
- 4 tabs: Capture, Garden, Timeline, Settings
- Capture is the first/default tab
- Settings tab with rarely-used features (export, native plants DB, clear data, sign out)

### New
- **2 tabs**: Garden (home/default), Timeline
- **Floating Action Button (FAB)**: Terracotta "+" button centered between tabs for capture
- **Settings tab removed entirely**: Gear icon in Garden header opens a minimal settings sheet
- **Native plants DB removed**: Only 15 entries vs user's 100+ plants; not useful (functional removal acknowledged — see Non-Goals)
- **Capture is a full-screen modal**, not a tab — slides up from the FAB

### Gear Icon Settings Sheet
A minimal bottom sheet (same modal pattern as detail modal) triggered from the gear icon in the Garden header. Contents:
- **Export Data**: JSON/CSV export buttons (relocated from Settings tab)
- **Clear All Data**: Danger action with confirmation (relocated from Settings tab)
- **Sign Out**: At the very bottom, subtle text link
- Dark mode toggle placeholder (future — not implemented in this redesign)

This sheet reuses the existing `.modal-overlay` + `.modal-sheet` pattern. No new modal system needed.

### Navigation Bar
- Fixed bottom, white background, subtle top border and upward shadow
- Two tab icons with labels, spaced around a center gap for the FAB
- Active tab: deep green icon + bold label; inactive: gray
- FAB: 56px circle, terracotta gradient (`linear-gradient(135deg, #c4622d, #d4723d)`), white "+" icon, elevated shadow (`0 6px 20px rgba(196,98,45,0.35)`)

### Rationale
The primary user opens the app to browse her collection, not to capture. Garden as home matches her actual usage. Reducing to 2 tabs + FAB removes decision fatigue and makes the navigation feel intentional rather than cluttered.

## 2. Global Visual System

### Text Rendering
Add to the global reset:
```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;
}
```

### Gradient Backgrounds
Replace all flat solid backgrounds with subtle gradients:

- **Page background**: `linear-gradient(170deg, #f5f0e8 0%, #ece5d6 50%, #e0d8c8 100%)` — warm cream flowing subtly darker
- **Screen headers**: `linear-gradient(135deg, #1c3a2b 0%, #2d5a3d 70%, #3d6a4d 100%)` — deep forest flowing to mid green
- **Welcome screen**: `linear-gradient(160deg, #2d5a3d 0%, #1c3a2b 30%, #2a4a38 60%, #3d5a3d 80%, #4a6a4a 100%)` — rich forest gradient
- **Primary buttons**: `linear-gradient(135deg, #1c3a2b, #2d5a3d)`
- **FAB**: `linear-gradient(135deg, #c4622d, #d4723d)`
- **Tags/chips**: `linear-gradient(135deg, #c8dfc9, #e8f0e8)` for green tags; `linear-gradient(135deg, #fde8e8, #fef0f0)` for insect tags
- **Active filter chip**: `linear-gradient(135deg, #1c3a2b, #2d5a3d)`

### Card System
One unified card pattern used everywhere:
- Background: white
- Border-radius: 14px
- Shadow: `0 2px 10px rgba(28,58,43,0.06)` (resting), `0 3px 14px rgba(28,58,43,0.09)` (garden grid cards)
- Padding: 16px
- Margin-bottom: 12px between cards

### Section Headings
One consistent heading style for all card sections:
- Font: `var(--font-display)` (Playfair Display with Georgia fallback) — all "Georgia serif" references in this spec mean this font stack
- Size: 13px
- Weight: 600
- Color: `#7a9e7e` (sage green)
- Transform: uppercase
- Letter-spacing: 0.08em

### Fix Undefined CSS Variables
Replace all instances of `--green` with `--green-deep` and `--terracotta` with `--terra`.

### Literary Language
Throughout the app, use warmer, more botanical language:
- "species cataloged" instead of "plants"
- "visitors observed" instead of "bugs"
- "Visitors" instead of "Linked bugs"
- Empty states use literary quotes about gardens and nature instead of generic messages

## 3. Welcome Screen

Minimal, contemplative. A breath before entering the garden.

### Content (only these elements, nothing else)
1. Time-of-day greeting ("Good morning" / "Good afternoon" / "Good evening") — small caps, white at 75% opacity, wide letter-spacing
2. Thin terracotta decorative line — `linear-gradient(90deg, transparent, #e8a882, transparent)`, 32px wide
3. Literary quote — Georgia serif, 18px, italic, pure white, max-width 260px
4. Attribution — 11px, white at 55% opacity
5. "tap to enter" — 10px, white at 35% opacity, absolute positioned at bottom

### Background
Full-screen deep forest gradient. No nav bar visible on this screen.

### Interaction
Tap anywhere to dismiss welcome and transition to the **Garden screen** (not Capture). Update `dismissWelcome()` to call `showScreen('garden')`. The existing `welcome-fact-block` HTML is removed. Quote fades out (300ms), garden fades up from below (400ms ease-out).

### Quote Rotation
Rotate through a curated set of literary/garden quotes. The existing quotes array in `app.js` already supports this.

## 4. Garden Screen (Home)

### Header
- Gradient background (deep to mid green)
- Title: "My Garden" — Georgia serif, 24px, 700 weight, white
- Subtitle: "{N} species cataloged" — Georgia serif, 12px, italic, light green (`#c8dfc9`)
- Gear icon: 32px circle, `rgba(255,255,255,0.12)` background, white icon at 80% opacity, `backdrop-filter: blur(4px)`
- Search bar integrated in header: `rgba(255,255,255,0.12)` background, rounded 10px, frosted glass look with `backdrop-filter: blur(4px)`, placeholder text in white at 50% opacity

### Filter Chips
- Horizontal scrollable row below header
- Active chip: gradient green background, white text
- Inactive chip: white background, gray text, subtle shadow (`0 1px 4px rgba(0,0,0,0.06)`)
- Pill-shaped (20px border-radius), 11px text

### Garden Grid
- 2-column responsive grid, 10px gap
- Each card: white, 14px radius, shadow, photo on top, info below

### Plant Cards (Compact Refined)
- Photo: fills top of card, aspect ratio ~1:1 or slightly wider
- Plant name: Georgia serif, 14px, 600 weight, deep green
- Scientific name: sans-serif, 10px, sage green, italic
- Tags: small gradient pills below (9px text, 10px radius)
- Tap feedback: scale(0.97) on press, shadow deepens

### Stats Row
Remove the current stats row (3 columns with numbers). The subtitle in the header ("47 species cataloged") replaces this — one number, not three competing.

### Sort Controls
Keep the sort dropdown (newest, oldest, name A-Z, etc.) but restyle it to match the new design. Place it inline with the filter chips row, right-aligned. Style: white background, subtle shadow, matching border-radius and text size as filter chips.

### Reminders Section
The "This Month in Your Garden" reminders section stays but is redesigned as a white card (same unified card system) placed above the garden grid. Collapsible with the same chevron pattern as detail modal sections. Reminder items inside use the same label/value typography as care profile items. The custom reminder input and AI-generated reminders continue to work as-is — only the visual treatment changes.

## 5. Plant Detail Modal

### Hero Image
- Full-width photo with rounded bottom corners (20px radius)
- Gradient overlay at bottom: `linear-gradient(transparent, rgba(28,58,43,0.85))`
- Name, scientific name, and status badges overlaid on the photo
- Name: Georgia serif, 24px, 700, white
- Scientific name: 13px, light green (`#c8dfc9`), italic
- Status badges: frosted glass pills — `rgba(255,255,255,0.18)` background, white text, `backdrop-filter: blur(4px)`

### Content Area (scrollable, below hero)
All sections use the unified white card system. Order:

1. **About Card** — 2-column grid of key-value pairs (Type, Added, Location, Confidence, Blooming season, etc.)
   - Labels: 10px, gray, uppercase, letter-spacing
   - Values: 13px, near-black, 500 weight
   - Location field designed to be tappable for future garden map integration

2. **Notes Card** — User notes in Georgia serif italic. Feels like a journal entry.

3. **Tags Card** — Pill chips with gradient backgrounds. Active tags in green gradient, inactive in white with border. Custom tag input below.

4. **Care Profile Card** (expandable) — Each care item has an emoji in a 32px rounded-square container with gradient green background. Label + value layout. Items: watering, sun, soil, fertilizing, pruning, mature size, pests, companion plants.

5. **Health History Card** (expandable) — Timeline of health log entries.

6. **Plant Status Card** (expandable) — Health, flowering, height, location, features form.

7. **Visitors Card** (expandable, plants only) — Linked insects displayed with name and scientific name. Renamed from "Linked bugs."

8. **Delete** — Subtle text link at the very bottom ("Delete this entry"), not a scary button. Terracotta color.

### Expandable Sections
- All use the same pattern: section heading on left, chevron SVG on right
- Chevron: 16px, gray stroke, rotates 180° on expand (250ms ease)
- Content height animation: read `scrollHeight` of the content container, animate `height` from 0 to that value (300ms ease). On collapse, animate back to 0. Set `overflow: hidden` during animation, remove explicit height after expand completes so content reflows naturally. This is vanilla JS — no library needed.
- Collapsed cards show just the heading row

## 6. Capture Flow

### Structure
The existing `#tab-capture` screen HTML is repurposed as the capture modal content. Instead of `showScreen('capture')`, the FAB calls a new `openCaptureModal()` function that:
1. Wraps the capture content in a `.modal-overlay` + `.modal-sheet` (same system as detail modal)
2. Slides it up with the spring curve animation
3. Close button or overlay tap calls `closeCaptureModal()` which reverses the animation

The capture HTML elements (canvas, photo zone, results area, manual entry) remain — only the container changes from a tab screen to a modal.

### Trigger
Tapping the FAB opens capture as a full-screen modal that slides up from the button position (400ms spring curve). The "+" icon rotates 45° during the transition.

### Layout
1. **Header**: "Add to Garden" title (Georgia serif, 20px, 700, deep green) + close button (32px white circle with X icon)
2. **Photo Card**: White card containing:
   - Preview area (200px height, cream gradient placeholder with camera icon)
   - Two action buttons below divider: "Camera" and "Gallery" — equal width, side by side, with icons
3. **Identify Button**: Full-width, gradient green, 12px radius, elevated shadow. "Identify Species" text.
4. **"or" Divider**: Horizontal line with centered "or" text
5. **Manual Entry Button**: Full-width, white, green text, subtle border
6. **Literary Quote**: Rotating garden quote at the bottom for warmth

### ID Results
Same white card system. Selected card gets green border with light green tint. Confidence badge maintains current color semantics (green/yellow/red).

## 7. Timeline Screen

### Header
Same gradient header pattern as Garden screen:
- Title: "Timeline" — Georgia serif, 24px, 700, white
- Subtitle: "Your garden's story" — Georgia serif, 12px, italic, light green

### Season Sections
- Season header: Georgia serif, 16px, 600, deep green, with gradient rule line extending to the right (`linear-gradient(90deg, #c8dfc9, transparent)`)
- Vertical timeline connector: 1.5px line, gradient from sage green to cream

### Timeline Entries
- Dot indicator on the timeline line: 8px circle, gradient green for plants, gradient terracotta for insects, 3px white ring (`box-shadow: 0 0 0 3px #f5f0e8`)
- Entry card: white, 12px radius, shadow, showing name + scientific name + date + tags
- Entries are tappable — open the same detail modal

## 8. Motion & Animation

### Timing Constants
- Quick feedback: 100-150ms (button press, scale)
- Standard transitions: 200-300ms (fades, chevron rotation)
- Entrance animations: 300-400ms (modals, screen transitions)
- Ambient: 3000ms cycles (FAB shadow pulse)

### Easing
All animations use cubic-bezier curves, never linear. Standard ease-out for entrances, spring curves for modals: `cubic-bezier(0.32, 0.72, 0, 1)`.

### Specific Animations

**Screen transitions:**
- Welcome → Garden: quote fades out (300ms), garden content fades up from translateY(12px) (400ms ease-out)
- Tab switches: cross-fade (200ms), no lateral slide
- Capture modal: slides up from FAB with spring curve (400ms), overlay fades simultaneously

**Card interactions:**
- Press: scale(0.97), shadow deepens (100ms)
- Release: spring back (200ms)
- Garden grid load: cards stagger in, each 40ms after previous, fade + translateY(8px)
- Detail modal: card expands into full modal (300ms spring), content fades in after container settles

**Expandable sections:**
- Chevron rotates 180° (250ms ease)
- Content animates to measured height (300ms ease)

**FAB:**
- Idle: shadow gently pulses larger/smaller (3s cycle, infinite)
- Press: scale(0.9) (100ms), "+" rotates 45° as capture modal rises
- On scroll down: slightly shrinks and reduces opacity; returns on scroll up

**Loading & feedback:**
- Species ID loading: three dots pulsing in sequence (organic heartbeat, not mechanical spinner)
- Save confirmation: green checkmark scales in with bounce (300ms), then fades
- Delete: card shrinks and fades (200ms), remaining cards shift up to close gap

**Reduced motion:**
Honor `prefers-reduced-motion: reduce` via a single global CSS rule:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```
Place in `base.css` at the end of the reset section. This catches all CSS animations. For JS-driven animations (staggered card entrance, height expand), check `window.matchMedia('(prefers-reduced-motion: reduce)').matches` and skip animation if true.

**Tab switch animation:**
Cross-fade between tabs using CSS transitions on opacity. When switching: set outgoing screen to `opacity: 0` (200ms ease), after transition ends remove `active-screen` from outgoing and add to incoming with `opacity: 0`, then set `opacity: 1` on next frame. Both screens are briefly in the DOM during the fade but only one is visible.

## 9. CSS Variable Cleanup

### Fix undefined variables
- Replace `--green` → `--green-deep` everywhere
- Replace `--terracotta` → `--terra` everywhere
- Replace hardcoded `#ddd` borders → `var(--cream-dark)`
- Replace inline computed colors (e.g., `rgba(196, 98, 45, 0.1)`) → CSS variable-based equivalents

### Radius and shadow consolidation
The existing `--radius: 16px` and `--radius-sm: 10px` are replaced:
- `--radius` → `14px` (was 16px — the new card radius, used for all cards and major containers)
- `--radius-sm` → `10px` (unchanged — used for inputs, chips, small elements)
- Timeline entry cards use `--radius-sm` (12px rounded down to 10px for consistency with the system)

The existing shadow system (`--shadow-sm`, `--shadow-md`, `--shadow-lg`) is kept but values updated:
- `--shadow-sm` → `0 2px 10px rgba(28,58,43,0.06)` (standard card shadow)
- `--shadow-md` → `0 3px 14px rgba(28,58,43,0.09)` (elevated/grid card shadow)
- `--shadow-lg` → `0 16px 48px rgba(28,58,43,0.18)` (unchanged — modal overlay)

No new `--card-shadow` or `--card-shadow-elevated` variables — use the existing three-tier system.

### New variables to add
```css
:root {
  /* Gradient backgrounds */
  --bg-page: linear-gradient(170deg, #f5f0e8 0%, #ece5d6 50%, #e0d8c8 100%);
  --bg-header: linear-gradient(135deg, #1c3a2b 0%, #2d5a3d 70%, #3d6a4d 100%);
  --bg-welcome: linear-gradient(160deg, #2d5a3d 0%, #1c3a2b 30%, #2a4a38 60%, #3d5a3d 80%, #4a6a4a 100%);
  --bg-btn-primary: linear-gradient(135deg, #1c3a2b, #2d5a3d);
  --bg-fab: linear-gradient(135deg, #c4622d, #d4723d);

  /* FAB */
  --fab-size: 56px;
  --fab-shadow: 0 6px 20px rgba(196,98,45,0.35);
}
```

## 10. Future Considerations

### Garden Map (next project)
- Google Earth satellite view of the yard
- User defines sectors and places plants at physical locations
- The Location field in the About card is designed to become tappable to show/set position on the map
- Navigation structure can accommodate a future Map tab or map integration within Garden view
- Plant cards and detail modals will eventually show richer location data

### Dark Mode (deferred)
- Perfect the light mode first
- When ready, dark mode should feel like "the garden at dusk" — warm deep greens, not generic charcoal
- Gear icon in header is the access point for the toggle

### Text rendering note
`-webkit-font-smoothing: antialiased` already exists in `base.css`. Add only the missing properties: `-moz-osx-font-smoothing: grayscale` and `text-rendering: optimizeLegibility`.

## Non-Goals

- No tablet/desktop responsive redesign (mobile-first, iPhone is the target)
- No new features — this is purely an aesthetic and organizational overhaul. Exception: the native plants DB removal and settings tab removal are acknowledged functional changes that serve the design goal of reduction.
- No changes to data model or edge functions
- No build tools or dependencies
