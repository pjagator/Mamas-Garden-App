# Identification Improvements + Manual Entry with Photo — Design Spec

## Overview

Three improvements to the species capture flow: (1) a viewfinder overlay that guides photo framing, (2) improved identification prompt with optional user-provided hints, and (3) manual name entry with photo when the user knows the species or the AI gets it wrong.

## Part 1: Viewfinder Overlay

### Camera Photos

After a camera photo is taken and displayed on the canvas (before tapping "Identify"), a rounded rectangle overlay appears centered on the image with darkened edges outside the box. A subtle label reads "Center your plant" below the viewfinder. This is visual guidance only — the full image is sent to the API, but the improved prompt tells Claude the subject is centered.

The overlay is purely CSS — a semi-transparent dark layer with a transparent cutout in the center. It appears on top of the canvas element.

### Gallery Uploads

After selecting a photo from the gallery, the user sees their image with a draggable/resizable viewfinder box. They can drag the image to reposition it within the viewfinder frame, and pinch-to-zoom (or use a slider) to resize. The area outside the box is darkened.

When they tap "Identify," the image is **cropped to the viewfinder box** before uploading. This handles gallery photos where the subject isn't centered or there are multiple plants in frame.

### Implementation

New component: `ImageCropper.tsx` — handles the interactive crop for gallery photos. Uses canvas manipulation to crop the final image. For camera photos, the existing canvas display gets a CSS overlay (no cropping needed).

## Part 2: Identification Prompt Improvements

### Updated System Prompt

Replace the current single-line role description with a detailed prompt that includes:

```
You are a botanist and entomologist specializing in Tampa Bay, Florida (USDA Zone 9b-10a).

The subject of interest is centered in this photo.

Identification guidelines:
- Focus on the most prominent organism near the center of the image
- Consider the plant's growth form carefully: distinguish trees from shrubs from herbaceous plants from vines from grasses
- Account for life stage: seedlings, juvenile plants, and dormant plants look very different from mature specimens in bloom
- If the photo shows bark, trunk, or canopy of a large plant, it is likely a tree — not an herb or wildflower
- Be conservative with confidence scores: use 90+ only when diagnostic features (flowers, fruit, leaf arrangement) are clearly visible. Use 50-70 when working from foliage alone
- If multiple species are visible, identify only the centered/most prominent one
```

### Optional User Hints

Three categories of optional hints, displayed as pill buttons on the photo screen after a photo is loaded:

**Growth form** (one selection max): Tree, Shrub, Vine, Wildflower, Grass/Sedge, Fern, Palm

**Life stage** (one selection max): Seedling, Mature, Dormant, In bloom, Fruiting

**Part photographed** (one selection max): Whole plant, Leaves, Flower, Bark, Fruit/seed

Each category is a row of pill-style toggle buttons. Tapping a pill selects it (tapping again deselects). All hints are optional — the user can skip them entirely.

Selected hints are passed to the `identify-species` API as a `hints` object:
```json
{
  "imageUrl": "...",
  "hints": {
    "growthForm": "Tree",
    "lifeStage": "In bloom",
    "partPhotographed": "Flower"
  }
}
```

The API appends any provided hints to the prompt:
```
The user has provided these hints about the subject:
- Growth form: Tree
- Life stage: In bloom
- Part photographed: Flower
```

## Part 3: Manual Entry with Photo

### Entry Point 1: "I know what this is" on the Photo Screen

After a photo is loaded (and the viewfinder/hints are showing), a secondary button appears below the "Identify species" button: "I know what this is" (text link style, not a prominent button).

Tapping it replaces the hints section with a simple inline form:
- Common name (required, text input)
- Scientific name (optional, text input)

Below the form: "Add to Garden" and "Save as Friend" buttons (same as the results screen).

On save:
1. Upload photo to storage
2. Create inventory/wishlist item with `source: 'Manual'`, the photo, and the entered name
3. Use `matchNative()` to check if it's a known native species (auto-fill scientific name, bloom, native status)
4. Kick off background care profile generation via the `garden-assistant` API (same as AI-identified plants)
5. The plant gets all features: care profile, propagation advice, health tracking, etc.

### Entry Point 2: "Not right? Enter manually" on the Results Screen

Below the AI result cards, a text link: "Not right? Enter name manually"

Tapping it shows the same common name + scientific name form inline, replacing the result cards. The photo is still attached. Same save flow as above.

### Source Distinction

Plants entered manually with a photo get `source: 'Manual'` and `confidence: null`. They are otherwise identical to AI-identified plants — same data model, same features, same care profile generation.

## Files Changed

1. `react-app/api/identify-species.ts` — improved prompt, accept and inject hints
2. `react-app/src/components/capture/CaptureSheet.tsx` — viewfinder overlay for camera, hint pills, manual entry option on photo + results screens, "I know what this is" and "Not right?" entry points
3. New: `react-app/src/components/capture/ImageCropper.tsx` — interactive drag/zoom crop component for gallery photos
4. New: `react-app/src/components/capture/ViewfinderOverlay.tsx` — CSS overlay component with darkened edges and center cutout, used on camera photos

## Out of Scope

- Actual camera viewfinder (live preview with overlay) — the overlay appears on the captured photo, not during live camera
- Multiple species identification in one photo
- Image quality detection / "photo too blurry" warnings
- Changes to the existing standalone ManualEntry component (no-photo manual entry stays as-is)
