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
