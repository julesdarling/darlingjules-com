# About checklist visual QA

Result: passed

## Source and implementation

- Source: `/var/folders/0j/f8hz42fn3vxcrz0v7qrlggqm0000gn/T/codex-clipboard-01193d53-87a4-4d7d-92a1-77546a734e4a.png`, 444 × 440, dark Apple Notes checklist, all unchecked.
- Desktop implementation: `artifacts/content-update/apple-notes-context-desktop.jpg`, 1440 × 1000 viewport, `/about`, checklist visible alongside “Outside the office”, all unchecked.
- Mobile implementation: `artifacts/content-update/apple-notes-mobile.jpg`, 390 × 844 viewport, `/about`, first item checked to show the completed state.
- Viewed the source and implementation images directly. The user's later request for rounded corners and more top/left space supersedes the original square frame and tight padding.

## Visual comparison

| Surface | Result |
| --- | --- |
| Typography | Apple system font, 20px medium text with 24px leading. The Notes card intentionally uses native system typography rather than the surrounding site's Libre Franklin. |
| Layout | 444px desktop width; 31px rows; 24px circles; 10px circle-to-text gap. The requested 18px corner radius and 28px top/left padding are applied. Mobile wraps the longest item naturally without overflow. |
| Color | Dark #1e1e1e note, #dcdcdc copy, #535353 unchecked circles, gold #f2c14f completed controls. |
| Assets | Native checklist controls and text; no substitute imagery or external assets. |
| Copy | “To do today:” and all eleven supplied tasks are present in the original order. |

## Interaction and responsive checks

- Each row labels a native checkbox. Clicking and keyboard operation toggle the gold check and strike-through; unchecking restores the original state.
- The checklist remains readable and contained at desktop and mobile sizes.
- Seven required routes checked at 1440 × 1000 and 390 × 844: home, all work, About, Google Maps, NotebookLM, IBM Watson, and superliminal design. All scroll normally, have no horizontal overflow, and have no terminal headline periods. Measurements are saved in `artifacts/content-update/final-route-checks.json`.
- No browser console errors observed during the final checks.

No unresolved blocking visual or interaction differences remain. Native glyph rasterization can vary by operating system.

# Responsive hero visual QA

Result: passed

## Source and comparison

- Source: `/var/folders/0j/f8hz42fn3vxcrz0v7qrlggqm0000gn/T/codex-clipboard-cbfbbb4d-bf45-433b-a8b9-fb3b8b1d1704.png`, 1368 × 848.
- Implementation: `artifacts/responsive-hero/1368x848.jpg`, 1368 × 848; `artifacts/responsive-hero/390x844.jpg`, 390 × 844.
- Opened the source and implementation together. The approved hierarchy is retained: large curved text, flowers below, centered copy and button, then the logo ring. The exact words and logos visible vary with the animation phase.

| Surface | Result |
| --- | --- |
| Typography | Xanh Mono ring text retains its natural proportions through uniform 3D scaling. Libre Franklin body copy uses a bounded fluid size and a readable measure. |
| Layout | A normal grid/flex stack replaces absolute flower placement, negative copy margins, and breakpoint-specific scene offsets. Rings fit their measured layout slots at every width. Only their artwork is clipped. |
| Color | Existing near-black text, charcoal logos, white surface, and ambient pink CTA are retained. |
| Assets | Existing flower SVGs and client logos are preserved. |
| Copy | Existing hero text, eight alternating labels, and View Work action are unchanged. |

## Responsive and fallback checks

- Tested 320 × 740, 390 × 844, 768 × 1024, 1024 × 768, 1368 × 848, 1440 × 1000, 1440 × 600, and 1920 × 1080. Every size has ordered, non-overlapping layout slots, a centered action, and no horizontal overflow. Measurements: `artifacts/responsive-hero/layout-checks.json`.
- A shorter window at the same width retains the same flow and scrolls naturally; sizing no longer depends on a fixed viewport-height scene.
- Tested the actual built HTML with scripts removed in a temporary local fixture at mobile and desktop sizes. The fallback H1 occupies the title slot above the flowers and copy without overlap. The same static structure remains available when the existing reduced-motion/WebGL guard skips the scene.
- Required companion routes were checked at 1440 × 1000 and 390 × 844; they scroll and have no horizontal overflow. Measurements: `artifacts/responsive-hero/route-checks.json`.
- Independent Three.js fitting checks covered 54 width/scale/tilt combinations with finite positive results. No browser console errors were observed.
- Local controls use fresh v2 storage keys. Old saved pixel offsets remain untouched in v1 and are not reapplied over the responsive composition.

# Opening, typography, and content refinements

Result: passed

## Opening viewport and headings

- The hero and logo band share a content-driven opening container centered beneath the measured navigation. It uses a viewport minimum, so short screens can grow without clipping content. The work headline stays below the first frame.
- Checked 320 × 740, 390 × 844, 768 × 1024, 1024 × 768, 1204 × 853, 1440 × 1000, 1440 × 600, and 1920 × 1080. Center error stayed below 0.01px; no horizontal overflow appeared. Measurements: `artifacts/nov26-refinements/final-home-checks.json`.
- The work headline is centered and reads “She's got taste”. The portrait headline is restored to “Meet Jules”; its text remains inside the responsive portrait layout.
- Capabilities and When to bring me in have identical computed heading sizes at every tested width. My point of view has bounded space above and below (32px at desktop).
- The phone text ring defaults to 150% up to 767px. Desktop defaults to 100%; control values match the scene. Ring controls use v3 storage, preserving earlier saved values in their old namespace.

## Body typography and articles

- Epilogue Light 300 is used for regular body copy; Medium 500 is used for emphasis and the Design Director portrait caption. The rotating role remains Light. Xanh Mono headings retain their original weight.
- Paragraphs, captions, lists, and article copy share headline ink, rgb(17, 16, 15). Nine representative routes were checked at desktop and mobile sizes, all with Epilogue, intended weights, normal scrolling, and no horizontal overflow. Measurements: `artifacts/nov26-refinements/text-route-checks.json`.
- Native Notes text retains its Apple system font and weight 500, with readable dark-surface colors. CTA labels retain their functional contrast.
- All nine built articles were checked for original-publication credit lines; none remain. The three sources that contained the footer were edited without altering the article bodies or images.

## Hand-drawn icons

- Reference: `/var/folders/0j/f8hz42fn3vxcrz0v7qrlggqm0000gn/T/codex-clipboard-d553152d-5e27-43f7-b913-8cc2162ad019.png` (flower style).
- Added sixteen custom SVG doodles with rounded, irregular near-black strokes and transparent backgrounds: nine capability icons and seven How I work icons. All sixteen assets loaded successfully in the browser and are decorative to assistive technology.
- Capability labels inherit the body typography; mobile uses one column so longer labels fit. The About list replaces its emoji assets with the matching doodles.
- Screenshots: `artifacts/nov26-refinements/capabilities-desktop.jpg`, `capabilities-mobile.jpg`, `how-i-work-desktop.jpg`, and `how-i-work-mobile.jpg`. Desktop captures are 1440 × 1000; mobile captures are 390 × 844.
- Compared linework, sizing, label alignment, spacing, colors, and copy in the rendered implementation. No unresolved blocking differences or browser console errors remain.

## Role capitalization correction

- Verified all 69 built pages: all eight rendered role-title occurrences use “Design Director”, including the text-cylinder data attribute. The headline normalizer protects this preferred capitalization.
- Verified the built portrait heading reads “Meet Jules”. Astro check, build, site verification, and whitespace checks passed.

# Testimonial heart refresh

Result: passed

- Replaced the glossy heart sprites with three transparent cutouts based on Jules’s supplied silhouettes. The trail cycles 01 → 02 → 03 → 01, preserving the pink color, existing drift, fade, blur, and cleanup. Native pointer input verified the exact cycle; particles were removed when their animation finished.
- Added the supplied three-heart outline arrangement immediately above What clients remember. Rounded near-black linework uses three subtly varied frames at the hero flowers’ .42s stepped cadence. A static picture source and an internal SVG media query support reduced motion; the decorative artwork is hidden from assistive technology.
- Desktop 1440 × 1000: cluster width 112px, heading gap 24px. Mobile 390 × 844: cluster width 80px, heading gap 16px. Both are centered with no horizontal overflow.
- The transparent 256px web derivatives total 97,296 bytes. Full-size imagegen outputs and prompts are retained locally under `artifacts/heart-refresh/`.
- Reviewed all seven required routes at desktop and mobile dimensions. Pages scroll normally, headings have clean spacing, and media keep their proportions. Screenshots are under `artifacts/heart-refresh/`.
- Astro check passed with no errors or warnings (one existing unused-variable hint). Build generated 69 pages, site verification passed 68 routes, and `git diff --check` passed.

# Outlined particle and icon corrections

Result: passed

## Crisp white heart particles

- Replaced the pink PNG masks with three individual SVG hearts traced from the supplied outline cluster. They have white fills and rounded near-black outlines, alternating through all three shapes.
- Removed the blur tween and filter hint. Particle motion uses 2D transforms (`force3D: false`), avoiding the previous forced 3D layer during scaling. Starting scale remains .62–.88; final scale is reduced to 1.1–1.6, about 40% smaller than before. Drift, opacity fade, reduced-motion guard, and cleanup remain intact.
- Native pointer input verified that all SVGs load, cycle, and stay at computed filter `none` through different fade stages. Their inline transforms use 2D translate/rotate/scale. Completed particles were removed.
- Screenshot: `artifacts/heart-refresh/outlined-particles-desktop.jpg`.

## Capability alignment

- Centered icons against their entire label boxes and removed the old top margin. All nine icon/label center differences measured 0px at 1440 × 1000 and 390 × 844, including wrapped desktop labels. No horizontal overflow.
- Screenshots: `artifacts/heart-refresh/capabilities-aligned-desktop.jpg` and `capabilities-aligned-mobile.jpg`.

## Cute How I work doodles

- Replaced the About list’s technical symbols with seven organic SVG doodles: bunny, songbird, smiling blossom, bee, mushroom pair, cat, and butterfly. All seven loaded and remain decorative to assistive technology.
- Reviewed the list on desktop and mobile, with stable icon sizes, readable wrapping, and no overflow. Screenshots: `artifacts/heart-refresh/cute-how-i-work-desktop.jpg` and `cute-how-i-work-mobile.jpg`.
- Reviewed the required home, About, All work, three project, and writing routes at both standard viewport sizes. No layout regressions or horizontal overflow were observed.
- Astro check, build (69 pages), site verification (68 routes), and whitespace checks passed. The existing unused-variable hint and bundle-size advisory are unchanged.

# Cute capability doodles

Result: passed

- Replaced all nine technical capability symbols with the same organic animal and flower set used on About: songbird, blossom, bunny, mushrooms, cat, duck, butterfly, tulip, and bee. Added matching duck and tulip SVGs; reused the other seven assets.
- All nine icons loaded at 1440 × 1000 and 390 × 844. Icon/label center differences remain 0px, including wrapped desktop labels, with no horizontal overflow. The icons remain decorative to assistive technology.
- Screenshots: `artifacts/cute-capabilities/desktop.jpg` and `mobile.jpg`.
- Astro check, build (69 pages), site verification (68 routes), SVG XML validation, and whitespace checks passed.

# Flowers in the hero text ring

Result: passed

- Moved the original flower artwork into all eight gaps between the alternating Design Director and San Francisco labels. The curved flowers inherit the title ring’s rotation, tilt, position, scale, fog, and front-face visibility. Letter sizing and aspect remain unchanged.
- Reused the three original SVG redraw frames as small shared textures, keeping the stepped .42s boiling cadence with staggered phases. Texture drawing occurs once, not every animation frame. Geometry, textures, and materials participate in scene cleanup.
- Removed the small standalone flower row and its empty grid track. Portrait flowers and the favicon remain intact.
- The controls now include Ring flowers Size, Animation speed, and Opacity. Native keyboard input verified size changes, zero speed, and zero opacity; all values were restored to their defaults afterward. Dragging the ring and navigating to About and back worked without browser errors.
- Checked 320 × 740, 390 × 844, 768 × 1024, 1024 × 768, 1368 × 848, 1440 × 600, 1440 × 1000, and 1920 × 1080. No horizontal overflow, positive title-to-copy gaps, and selected work below the first frame at every size. Hero center error stayed below .01px.
- Static fallback retains both labels and a decorative flower separator. A temporary script-free build fixture passed at 320px, 390px, and 1440px, with no overlap or overflow; the fixture was removed afterward.
- Screenshots and layout measurements: `artifacts/hero-ring-flowers/`. Independent scene review, Astro check, build, site verification, and whitespace checks passed.

# Centered button labels

Result: passed

- CTA labels now receive their shared wrapper in the rendered HTML, making alignment consistent with animation enabled, reduced motion, or no JavaScript. Client enhancement recognizes the existing wrapper without duplicating it.
- Corrected Epilogue’s visible-letter alignment with a proportional .09em vertical offset. Existing Xanh Mono footer labels retain their centered font metrics, and calendar icons counter the text-only adjustment.
- Equalized the two asymmetric mobile horizontal-padding rules while preserving their total width. At the original 1280px comparison size, View Work remains 133.906 × 48px and Get in touch remains 289.734 × 89.594px.
- Checked all seven required routes at 1440 × 1000 and 390 × 844. Visible labels have 0px horizontal center error, symmetric padding, one label wrapper, and no horizontal overflow. Measured offsets and screenshots are under `artifacts/button-centering/`.
- A temporary script-free home fixture retained the same label alignment; the fixture was removed afterward. Independent review, Astro check, build, site verification, and whitespace checks passed.

# Clean cylinder startup and hero copy

Result: passed

- The initial HTML marks the hero pending. A synchronous head bootstrap and CSS gate clip the accessible static title and hide the flat logo row before module loading. Hidden stage and logo anchors remain measurable, reserving their responsive layout.
- The scene reveals both cylinders only after its first successful render. Import, asset, and setup failures use the shared fallback state. A module-independent 10-second watchdog handles stalled startup; late results cannot replace a timed-out fallback. Reduced-motion discovery immediately selects the static fallback. Astro navigation marks the incoming document before swapping and cancels the previous watchdog.
- Temporary blocked-module and script-free build fixtures verified the pending gate and no-JS fallback at 1440 × 1000 and 390 × 844, plus timeout fallback on desktop. The title remains accessible while clipped. Both fixtures were removed afterward. Native About-to-home navigation returned to rendered cylinders successfully.
- Replaced the hero copy with the supplied two paragraphs in the existing Epilogue Light styling. Measured paragraph gap is about 19px on desktop and 16px on mobile; font sizes remain 20px and 16px respectively. Body copy controls now move the group together and update both paragraphs' font, leading, and width.
- Changed the home footer and About contact buttons to “Say hey”, preserving their existing mail links and glitter treatment.
- Home and the six other required routes remain scrollable without horizontal overflow at both standard viewport sizes. Home selected work stays below the opening frame. Screenshots and route measurements are under `artifacts/cylinder-load/`.
- Independent startup/lifecycle review, Astro check, build (69 pages), site verification (68 routes), and whitespace checks passed. The existing unused-variable hint and bundle-size advisory are unchanged.

# Remove the opening hero line

Result: passed

- Removed “I lead the work and make the work.” The hero now contains only the supplied “20 years…” paragraph. Its single-child flex wrapper adds no empty paragraph gap, and the body controls still apply normally.
- At 1440 × 1000 and 390 × 844, the paragraph-to-button gaps remain about 19px and 16px, the page has no horizontal overflow, and selected work begins below the opening viewport. All six other required routes still scroll without horizontal overflow.
- Independent markup/control review, Astro check, build, site verification, and whitespace checks passed. Screenshots and route measurements are under `artifacts/hero-line-removal/`.

# About bunny and custom icon sets

Result: passed

## Cursor-following bunny

- Added the supplied eight-pose bunny above the About page's closing headline, using the original PNG unchanged and CSS sprite framing. The final revision makes her about one third smaller: frame widths are 136px on desktop and 112px on mobile, with a 4px layout gap above the headline. No dark artwork is clipped in any pose.
- Native pointer input verified all eight gaze directions. Tracking batches work into a single requested animation frame, updates on scrolling/resizing, and stops while hidden or off screen. A small angular overlap prevents twitching at direction boundaries.
- Independent in-memory lifecycle checks passed for all directions, coalesced events, scroll recalculation, touch rejection, reduced-motion/coarse-pointer preference changes, and cleanup. Astro navigation removes listeners and queued frames. The decorative bunny is excluded from assistive technology.
- A temporary script-free About fixture showed the default pose correctly at 390 × 844 with no overflow; the fixture was removed afterward. Screenshots include `bunny-small-desktop.jpg` and `bunny-small-mobile.jpg` under `artifacts/about-bunny-icons/`.

## How I work icons

- Applied the requested running bird, facing fish pair, two mushrooms, bow, sheep, smiley bunny, and princess wand. The five new SVG assets match the existing rounded hand-drawn linework. Wand sparkles use a restrained opacity animation and remain static for reduced motion.
- All seven assets load at desktop and mobile sizes, retain their existing first-line alignment, and remain decorative. Screenshots: `how-i-work-desktop.jpg` and `how-i-work-mobile.jpg`.

## Capability icons

- Added the owl with a book, smiling phone, circuit brain, globe, circus tent, and cow. Preserved the blossom, butterfly, and tulip requested to stay. Renamed the tent item to “Event and Interactive Experiences”.
- All nine SVGs load and their label/icon center differences remain 0px at 1440 × 1000 and 390 × 844, including wrapped labels. Screenshots: `capabilities-desktop.jpg` and `capabilities-mobile.jpg`.
- All eleven new SVGs passed XML checks. The seven required routes still scroll without horizontal overflow at both standard viewport sizes. Independent review, Astro check, build (69 pages), site verification (68 routes), and whitespace checks passed. The existing unused-variable hint and bundle-size advisory remain unchanged.

# Writing whale, biography, and final refinements

Result: passed

## Registered whale animation

- Replaced the two large blue edge whales with the supplied small hand-drawn whale above “From the pool of wisdom”. Removed the introductory methodology/process line. The article links and contact action remain centered and responsive without the old mobile whale padding.
- Reused the original 8 × 4 PNG unchanged. Each of the 32 poses now has a registered body center and waterline plus its own clipping rectangle, preserving hearts, rays, eyes, and complete outlines while excluding neighboring fragments. Unregistered waterlines varied from 152.75px to 217px; all are now aligned to 200px in source-frame coordinates, with a common 110.875px horizontal center.
- All 32 poses passed dark-ink and antialias-bound checks: no clipped pose components or foreign pixels. Two different rendered rows measured identical body centers and baselines in browser screenshots. Proof is retained in `artifacts/writing-whale-refinements/registration-proof.json` and `rendered-registration.json`.
- The 4.48s stepped loop pauses off screen or when the document is hidden. Independent lifecycle checks passed for intersection visibility, preference changes, and cleanup. Reduced motion and no JavaScript show the registered first pose. A temporary script-free fixture verified the static frame and was removed afterward.

## Portrait biography

- Replaced the standalone Design Director label and rotating titles with the two supplied biography paragraphs, retaining she/her below the portrait. Removed the old rotation module, initialization, and styles, so no old title layers remain.
- The biography uses Epilogue Light at 18px/28.8px on desktop and 16px/25.6px on mobile, with a clear paragraph gap. Both paragraphs fit their centered measure without overflow or collision.

## Logos and About icons

- Hero logos now use opaque near-black ink. LiveRamp is 350 × 86 instead of 298 × 86, about 17.4% wider with its height unchanged; existing ring geometry and edge fading remain intact. The static fallback uses black filtering and the matching horizontal stretch.
- Clear communication now uses two inward-facing fish at the same height, enlarged 25% without moving the label column. No ego now uses a side-profile baby lamb. Both SVGs load successfully and retain the existing rounded linework.

## Copy and navigation removals

- Both contact buttons now say “Say heyyyyy”, retaining centered labels and the existing glitter interaction.
- Removed the final “Built for teams…” sentence from the All work introduction and the homepage's “View All Projects” link. The remaining archive copy and Work navigation remain intact.
- All seven required routes scroll without horizontal overflow at 1440 × 1000 and 390 × 844. Focused screenshots and route measurements are under `artifacts/writing-whale-refinements/`.
- Independent review, Astro check, build (69 pages), site verification (68 routes), and whitespace checks passed. The existing unused-variable hint and bundle-size advisory remain unchanged.

# Whale flicker and title-ring letter fade

Result: passed

- Removed the title texture's baked edge-opacity mask, which was fading the first and last letters. Existing font fitting leaves ample empty space at the repeating texture seam. Ring geometry, controls, and depth fog are unchanged; desktop screenshots show uniformly dark lettering.
- The whale now prepares all 32 registered poses into fixed-size canvas buffers, then copies each complete buffer in one paint. It no longer animates a translated, clipped spritesheet in the DOM. The original PNG and 140ms frame cadence remain unchanged.
- Eight browser captures across the loop contain complete, nonempty whale drawings. Their waterline baseline is identical; body-center variation is at most one screenshot pixel from rasterization. Mobile framing remains 84px wide, and desktop framing remains 100px wide.
- Verified offscreen pause and a static, script-free fallback at both required viewport sizes. The static image stays visible until the first complete canvas frame has been painted. Animation cleanup removes observers, listeners, the canvas, and queued animation work.
- The seven required routes remain scrollable without horizontal overflow at 1440 × 1000 and 390 × 844. Screenshots and measurements are under `artifacts/whale-flicker/`. Astro check, build, site verification, and whitespace checks passed; the existing hint and bundle-size advisory remain unchanged.
