# Garden App -- Learn by Building: Professional App Techniques

## How to Use This

Work through one lesson per session with Claude Code. Each lesson teaches a technique and applies it to the garden app. Don't skip ahead. Each builds on the last.

Before each session, tell Claude Code:
```
Read PROJECT-CONTEXT.md and LEARNING-PLAN.md. I'm working on Lesson [X]: [title]. Explain the concept briefly, then help me implement it. Show me what's changing and why.
```

After each lesson, push to GitHub and test on your phone.

---

## Lesson 1: Typography Scale and Vertical Rhythm

**What you'll learn**: Professional apps use a mathematical type scale, not random font sizes. Every text element has a deliberate size, weight, and line height. Vertical rhythm means spacing between elements follows a consistent base unit (usually 4px or 8px).

**What to build**: Refactor style.css to use a type scale and spacing system.

```
Define a type scale in CSS custom properties:
  --text-xs: 0.75rem (12px)
  --text-sm: 0.875rem (14px)
  --text-base: 1rem (16px)
  --text-lg: 1.125rem (18px)
  --text-xl: 1.25rem (20px)
  --text-2xl: 1.5rem (24px)
  --text-3xl: 1.875rem (30px)

Define a spacing scale based on 4px:
  --space-1: 4px
  --space-2: 8px
  --space-3: 12px
  --space-4: 16px
  --space-6: 24px
  --space-8: 32px
  --space-12: 48px

Replace every hardcoded font-size and margin/padding in style.css with these variables. Audit every text element: headings, card names, scientific names, labels, buttons, tags. Each should use a specific step in the scale, not an arbitrary value.

Set line-height consistently: 1.2 for headings, 1.5 for body text.
```

**Why it matters**: This single change makes everything feel cohesive. Inconsistent sizing is the #1 giveaway of an amateur app.

---

## Lesson 2: Touch Targets and Mobile Interaction

**What you'll learn**: iOS Human Interface Guidelines specify 44x44pt minimum touch targets. Professional apps also add active/pressed states so users know their tap registered.

**What to build**: Audit and fix every tappable element.

```
1. Audit every button, card, chip, tab, and link in the app. Any touch target smaller than 44x44px needs padding or min-height/min-width added.

2. Add active/pressed states to all interactive elements:
   - Cards: subtle scale transform on press (transform: scale(0.98)) with a 150ms transition
   - Buttons: darken background by 10% on :active
   - Chips/tags: slight background color shift on :active
   - Tab bar buttons: add a subtle press state

3. Add CSS transition to all interactive elements:
   transition: transform 150ms ease, background-color 150ms ease, box-shadow 150ms ease;

4. Make sure no text is selectable on buttons/cards (user-select: none) to prevent the iOS text selection popup on long press.

Test every interactive element on iPhone. Does each one feel responsive? Does it give immediate visual feedback when touched?
```

**Why it matters**: Tap feedback is what makes an app feel native vs. feeling like a website. Without it, users tap and wonder if anything happened.

---

## Lesson 3: Loading States and Skeleton Screens

**What you'll learn**: Professional apps never show a blank screen or a generic spinner. They show "skeleton" placeholders that match the shape of the content being loaded. This makes the app feel faster even when it isn't.

**What to build**: Replace all loading states with skeletons.

```
1. Create a CSS skeleton animation:
   - A pulsing gray rectangle that shimmers (gradient animation moving left to right)
   - Rounded corners matching the content it represents

2. When the Garden tab is loading inventory, show skeleton cards:
   - Same 2-column grid layout
   - Each skeleton card has: gray rectangle for image, two thin gray bars for name and scientific name, small gray pills for tags
   - 6 skeleton cards visible (fills the screen)

3. When the identification is running, show skeleton result cards instead of the spinner:
   - 3 skeleton cards matching the id-card layout

4. When the item detail modal opens, show skeleton content until data renders.

5. Remove all instances of the spinning circle loader. Replace every one with a contextual skeleton.
```

**Why it matters**: Skeleton screens reduce perceived loading time by 30-40% in user studies. They tell the user "content is coming and it'll look like this" rather than "something is happening, who knows what."

---

## Lesson 4: Smooth Transitions and Animations

**What you'll learn**: Motion design. Every state change (modal open, tab switch, filter change, card appear) should animate smoothly. The key principle: things should animate in a way that communicates what's happening spatially.

**What to build**: Add meaningful transitions throughout the app.

```
1. Modal transitions:
   - Bottom sheet (EntrySheet, item detail) slides up from the bottom (transform: translateY(100%) to translateY(0)) with a 300ms ease-out
   - Background overlay fades in (opacity 0 to 0.5) simultaneously
   - On close: reverse with 250ms ease-in (closing should feel slightly faster)

2. Tab switching:
   - Content cross-fades (opacity transition, 200ms) when switching tabs
   - Don't slide -- tabs are peers, not a sequence

3. Card appearance:
   - When the garden grid loads, cards fade in with a slight upward movement
   - Stagger the animation: each card starts 30ms after the previous one
   - Use: opacity 0 + translateY(8px) -> opacity 1 + translateY(0), 250ms ease-out

4. Filter changes:
   - When filtering, cards that are being removed fade out (150ms), then remaining cards reflow, then new cards fade in (150ms)

5. Collapsible sections:
   - Height animates smoothly (max-height transition or use the CSS grid row trick)
   - Chevron icon rotates 180 degrees

Add a CSS class for reduced-motion preference:
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
```

**Why it matters**: Animation communicates relationship and change. Without it, things pop in and out randomly. With it, the user's brain can track what happened.

---

## Lesson 5: Empty States with Personality

**What you'll learn**: An empty state is a design opportunity, not a failure case. It should tell the user what this screen is for and how to get started.

**What to build**: Design custom empty states for every screen.

```
1. Garden tab (no plants yet):
   - Illustration or large emoji (🌱)
   - Headline: "Your garden is waiting"
   - Subtext: "Capture your first plant to start building your collection."
   - Primary action button: "Take a photo" (navigates to Capture tab)

2. Garden tab (filter returns nothing):
   - "No [filter] plants found"
   - Subtext: "Try a different filter or add more plants."

3. Timeline tab (no plants):
   - Seasonal illustration
   - "See what blooms when"
   - "Add plants to your garden to see their seasonal timeline."

4. Search with no results:
   - "No matches for '[search term]'"
   - "Try a shorter search or check the spelling."

5. Identification (no results):
   - "Couldn't identify this one"
   - "Try a clearer photo with good lighting, focused on leaves or flowers."
   - "Or add it manually" button

Each empty state should use the app's typography scale, have generous padding, be vertically centered, and feel intentional rather than like an error.
```

**Why it matters**: Empty states are the first thing new users see. They set the tone for the entire experience.

---

## Lesson 6: Image Optimization and Progressive Loading

**What you'll learn**: Images are the heaviest part of most apps. Professional apps show small thumbnails in lists and only load full-resolution when the user taps in. They also show a blurred placeholder while the image loads.

**What to build**: Optimize image handling throughout the app.

```
1. When uploading images, create two versions:
   - Thumbnail (300px wide, 60% JPEG quality) for garden grid cards
   - Full resolution (900px, 82% quality) for detail view
   Store both in Supabase Storage. Add a thumbnail_url column to inventory.

2. In the garden grid, use the thumbnail URL. Add loading="lazy" to all img tags.

3. Add a blur-up loading effect:
   - Each card image starts with a solid background color (extracted from the image or just var(--cream))
   - When the image loads, it fades in over 300ms
   - CSS: img { opacity: 0; transition: opacity 300ms; } img.loaded { opacity: 1; }
   - JS: img.onload = () => img.classList.add('loaded')

4. In the detail modal, load the full-res image. Show the thumbnail first (already cached) and crossfade to full-res when it loads.

5. Add error handling: if an image fails to load, show a styled placeholder (plant/bug emoji on a colored background) instead of a broken image icon.

Database migration:
  alter table inventory add column thumbnail_url text;
```

**Why it matters**: A garden app is inherently image-heavy. Unoptimized images make the grid sluggish. Progressive loading makes it feel instant.

---

## Lesson 7: Error Handling and Resilience

**What you'll learn**: Professional apps handle every failure gracefully. The user should never see a raw error message, a frozen screen, or lose their work.

**What to build**: Comprehensive error handling.

```
1. Create a toast notification system:
   - Small bar that slides in from the top or bottom
   - Three types: success (green), error (red), info (neutral)
   - Auto-dismisses after 4 seconds, or tap to dismiss
   - Shows meaningful messages: "Plant saved to your garden" or "Couldn't save. Check your connection and try again."

2. Replace every alert() in the codebase with the toast system.

3. Add retry logic to the identification flow:
   - If the edge function call fails, show "Identification failed. Try again?" with a retry button
   - On network error specifically, show "No connection. Your photo is saved -- you can identify it when you're back online."

4. Add a double-tap guard on save buttons:
   - Disable the button immediately on tap
   - Re-enable after the operation completes (success or failure)
   - This prevents duplicate entries

5. Add offline detection:
   - Listen for online/offline events
   - Show a subtle banner at the top when offline: "You're offline. Changes will sync when you reconnect."

6. Wrap every Supabase call in try/catch with user-friendly error messages. Never expose raw database errors.
```

**Why it matters**: Users trust apps that handle problems well. One raw error message or frozen screen destroys confidence.

---

## Lesson 8: Gesture Support and Native Feel

**What you'll learn**: Native iOS apps support gestures: swipe to go back, swipe to delete, pull to refresh, pinch to zoom. Web apps can do all of these with touch events.

**What to build**: Add key gestures.

```
1. Swipe to delete on garden cards:
   - Swipe left reveals a red "Delete" button behind the card
   - Card slides back if released without completing the swipe
   - Tap delete to confirm and remove (with animation)

2. Pull to refresh on the Garden tab:
   - Pull down beyond a threshold shows a refresh indicator
   - Release triggers a reload of inventory
   - Smooth rubber-band animation

3. Swipe down to dismiss modals:
   - The detail modal and entry sheet can be swiped down to close
   - Tracks the finger position, with the modal following
   - If swiped past 30% of the height, it closes. Otherwise it snaps back.

4. Pinch to zoom on plant photos in the detail view:
   - Two-finger pinch zooms into the image
   - Pan while zoomed
   - Double-tap to toggle between fit and zoomed

Use touch event listeners (touchstart, touchmove, touchend). Track touch positions and apply transforms. Use requestAnimationFrame for smooth 60fps animations.
```

**Why it matters**: Gestures are what make a web app feel like a native app instead of a website.

---

## Lesson 9: Accessibility Fundamentals

**What you'll learn**: Accessibility isn't optional. It also improves the app for everyone (better contrast helps in sunlight, larger targets help with gloves on, etc.).

**What to build**: An accessibility audit and fixes.

```
1. Color contrast:
   - Audit every text/background combination against WCAG AA (4.5:1 for normal text, 3:1 for large text)
   - Fix any failures. The cream background (#f5f0e8) with lighter text is likely failing.

2. Semantic HTML:
   - Every button should be a <button>, not a <div onclick>
   - Headings should use h1-h6 in order
   - Lists should use <ul>/<li>
   - The tab bar should use <nav> with role="tablist"

3. ARIA labels:
   - Add aria-label to icon-only buttons (camera, gallery, remove, filter)
   - Add aria-expanded to collapsible sections
   - Add role="dialog" and aria-modal="true" to modals

4. Focus management:
   - When a modal opens, focus moves to the first interactive element
   - When it closes, focus returns to the element that triggered it
   - Tab key should cycle through modal content, not the page behind it (focus trap)

5. Screen reader announcements:
   - When identification completes, announce "3 species identified" via aria-live region
   - When a plant is saved, announce "Plant saved to garden"

6. Reduced motion (from Lesson 4): ensure all animations respect prefers-reduced-motion
```

**Why it matters**: 15-20% of people have some form of disability. Beyond ethics, accessible apps are more robust and better designed for everyone.

---

## Lesson 10: Performance Optimization

**What you'll learn**: How to measure and improve performance. The goal: first paint under 1 second, interactive under 2 seconds, smooth 60fps scrolling.

**What to build**: Measure and optimize.

```
1. Measure baseline:
   - Open Chrome DevTools > Lighthouse > run a mobile performance audit
   - Note the scores: Performance, FCP, LCP, CLS, TBT
   - Screenshot it. This is your "before."

2. Optimize CSS:
   - Move critical CSS (everything above the fold) inline in index.html <style> tag
   - Load the full style.css asynchronously
   - Remove any unused CSS rules

3. Optimize JavaScript:
   - Defer non-critical JS (export functions, native plant DB) into separate files loaded on demand
   - Use requestIdleCallback for non-urgent work
   - Debounce the search input (300ms delay before filtering)

4. Optimize images (builds on Lesson 6):
   - Use srcset for responsive images
   - Add width and height attributes to all img tags to prevent layout shift (CLS)
   - Consider WebP format for smaller files

5. Virtual scrolling for the garden grid:
   - If the inventory grows past 50 items, only render cards visible in the viewport
   - Use IntersectionObserver to load/unload cards as user scrolls
   - This keeps the DOM small and scrolling smooth

6. Re-run Lighthouse. Compare scores. This is your "after."
```

**Why it matters**: Performance is a feature. Every 100ms of delay reduces engagement. Mobile users on slower connections feel this the most.

---

## After the 10 Lessons

By this point your garden app will have:
- Professional typography and spacing
- Responsive touch interactions
- Skeleton loading states
- Smooth animations
- Thoughtful empty states
- Optimized images
- Robust error handling
- Native-feeling gestures
- Accessibility support
- Measured and improved performance

These same techniques apply to the family tracker and any future app you build. The skills transfer completely.
