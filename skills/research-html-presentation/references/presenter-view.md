# Presenter View contract

## Contents

1. Purpose and boundary
2. Runtime data
3. Opening and window roles
4. State synchronization
5. Presenter interface
6. Notes integrity
7. Interaction rules
8. Presenter QA

## 1. Purpose and boundary

Use Presenter View as a private speaking aid. Keep the audience window on the established fixed-canvas academic deck. Do not change slide composition, canvas geometry, brand placement, evidence density, or layout selection to accommodate the presenter interface.

Do not include Presenter View, speaker notes, connection controls, or timer UI in screenshots intended as slides or in PDF export.

## 2. Runtime data

Extend slide metadata with an optional field:

```ts
notes?: string | string[];
```

Keep the field optional so existing decks compile without notes. Use a string for one compact note or an array for ordered speaking points. Keep notes outside the audience-facing slide body.

Do not place unsupported claims, invented mechanisms, fabricated values, or unreported limitations in notes. Use notes to clarify speaking order, attribution, transitions, evidence boundaries, and likely interpretation of already supported content.

Oral-only greetings, handoffs, transition cues, and现场提示 may be placed in the current slide's notes when useful for delivery, but must not be copied into the audience-facing slide body. This does not relax the one-to-one page mapping or the requirement to preserve supported facts, methods, data, conclusions, and argument relations.

## 3. Opening and window roles

Open Presenter View from the audience window with `P` or the restrained toolbar button. Use a separate same-origin browser window.

Keep these roles distinct:

- audience window: show the normal deck and accept the established navigation controls;
- presenter window: show current/next previews, notes, page state, timer, connection status, and navigation controls;
- print mode: show all final slides without either interactive shell.

If popup blocking prevents the presenter window from opening, report the problem clearly and leave the audience deck fully usable.

## 4. State synchronization

Synchronize absolute state rather than replaying raw key events:

- current zero-based slide index;
- per-slide fragment state;
- hash-equivalent page number.

Use a unique channel token passed in the presenter URL. Use `BroadcastChannel` when available and a same-origin `storage` event fallback otherwise. Include a unique sender ID and ignore self-originated messages.

Allow either window to navigate. Clamp received slide and fragment values to the current slide data. Update the local hash when remote state changes. Do not create message loops, duplicate page advances, stale fragment counts, or cross-talk between separately opened decks.

Send an initial state request from Presenter View. Respond from the audience window with the complete current state. Use a lightweight heartbeat or repeatable state request so the presenter can display `connecting`, `connected`, or `disconnected` honestly.

## 5. Presenter interface

Provide:

- current slide preview with the current fragment state;
- next slide preview at its initial fragment state;
- current title, section/chapter, and `current / total`;
- current-slide speaker notes;
- previous and next controls that respect fragments;
- elapsed-time display;
- start, pause, and reset timer controls;
- connection status.

Scale slide previews from the same `1600 × 900` render output. Disable interaction inside previews. Keep the presenter layout legible on a normal laptop window without introducing scroll inside the slide previews.

Do not implement draggable panels, arbitrary layout editing, cloud synchronization, multi-presenter collaboration, remote-device control, recording, or rehearsal analytics in this phase.

## 6. Notes integrity

Display notes only for the current slide. Show a clear empty state when notes are absent. Keep notes out of:

- audience slide DOM;
- image zoom and module focus overlays;
- print mode;
- PDF output;
- manifest fields intended for public metadata unless the project explicitly stores notes there.

Preserve source attribution in literature reviews and evidence-status wording in grant or project decks.

## 7. Interaction rules

Retain all existing audience controls. Add:

- `P`: open or focus Presenter View from the audience window;
- Presenter View previous/next buttons: apply the same fragment-first navigation as the audience window.

Do not let `P` recursively open another presenter window from Presenter View. Do not let presenter controls intercept input or editable-field keystrokes. Closing Presenter View must not reset or close the audience deck.

## 8. Presenter QA

Verify:

- `P` and the toolbar button open the same presenter session;
- popup failure is reported without breaking navigation;
- current and next previews show the correct slides;
- audience navigation updates Presenter View;
- presenter navigation updates the audience window;
- fragments synchronize in both directions;
- page number, chapter, and hash remain aligned;
- notes never appear in the audience window or PDF;
- timer starts, pauses, resumes, and resets correctly;
- closing and reopening Presenter View does not reset the deck;
- two decks use different channel tokens and do not exchange state;
- existing zoom, focus, fullscreen, chapter, progress, and overflow behavior remains intact.
