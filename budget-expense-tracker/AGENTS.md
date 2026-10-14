# App scaffold — AGENTS.md

React 19 + TypeScript + Vite 7 app from the Aether App Builder template — offline sandbox. When unsure of an import path, prop, or return type, read `node_modules/` or a neighbor in `src/` rather than reciting from memory (shadcn / Radix / TanStack / Tailwind APIs shift across versions).

## Dependencies

Pre-installed in a read-only `node_modules/` — compose the pre-built shadcn `@/components/ui/*` (merge a primitive onto your own element with `asChild`), don't reimplement. Version-specific facts you won't reliably guess:

- **react-router-dom** 7 — routes live in `src/routes.tsx` (see Structure).
- **zustand** 5 — one store in `src/lib/store.ts` (`useAppStore`, narrow selector).
- **@tanstack/react-query** 5 — every network/IO call; client `src/lib/query-client.ts`. v5 object API (`useQuery({ queryKey, queryFn })`, no `onSuccess`). An initially disabled query with no data has `isPending: true` but `isFetching: false`; use `isFetching` to disable a search/submit button while its query runs, not `isPending`, which can prevent the first request.
- **@tanstack/react-table** 8 — grids via `useReactTable` + `getCoreRowModel`.
- **leaflet** 1.9 + **@types/leaflet** — connector-backed maps import
  `SpatialMap`, its provider-independent DTOs, and `SpatialTileLoader` only
  from `@/components/spatial-map`; never import `leaflet` directly or hand-roll
  its browser APIs, `GridLayer`, tile decoder, or URL `TileLayer`. See
  [Connector-backed Spatial maps](#connector-backed-spatial-maps).
- **recharts** 3 — chart **primitives** (`<BarChart>`, `<Bar>`, `<XAxis>`, …) import from `recharts`; the shadcn **wrappers** (`ChartContainer`, tooltip, legend) from `@/components/ui/chart`. 3.x API, not v2. `ChartContainer` is `w-full` by default and Recharts sizes the chart from that box, so a chart sized only by a height or `aspect-*` class fills its container's width. To keep a chart narrower, give it an explicit width: `max-w-[250px] mx-auto` for a centred pie, donut or radial chart, `w-20 shrink-0` for a small gauge beside a label in a row. Never set `w-fit`, or `w-auto` with `mx-auto`: the box shrinks to its content, which is 0px, and the chart renders blank.
- **@dnd-kit/core** + **/sortable** — drag-reorder / kanban (not the HTML5 drag API).
- **react-day-picker** 9 + **date-fns** 4 — calendar via `@/components/ui/calendar`; date math via per-function `date-fns` imports.
- **signature_pad** 5.1 — use via `@/components/pen-input` (`<PenInput value={drawing} onChange={setDrawing} />`), never import `signature_pad` or hand-roll pointer/canvas drawing directly. It behaves the same in preview and published apps because capture is local browser canvas input; the wrapper emits a bounded, validated PNG value and keeps saving in app-owned code. Hold that customer content in session memory until the owning workflow saves it, never in `localStorage`, logs, URLs, analytics, or parent-frame messages. If an older app snapshot lacks the wrapper, recreate the app from the current template rather than adding a fallback implementation.
- **lucide-react** 1.x — icon names shifted at 1.x; grep `node_modules/lucide-react/dist/lucide-react.d.ts` if an import fails.
- **sonner** — toasts (`<Toaster/>` + `toast()`). **cmdk** — command menu. **cn()** (`@/lib/utils`) — merge classes.
- **xlsx** 0.18 / **unpdf** 1.x — client-side Excel/CSV + PDF text (see Conventions → File uploads).
- **html2canvas-pro** 2.4 + **jsPDF** 4.2 — Canvas-style PDF capture of an app-owned screen or container, with support for the template's modern CSS colors. Use the pre-baked `PdfExportButton` / `createPdfBlob` surfaces below; this is distinct from `unpdf`, which reads existing PDFs.
- **react-webcam** — use via `@/components/camera-capture` (`<CameraCapture onCapture={(dataUrl) => …} />`), never import `react-webcam` directly. `getUserMedia` only works once an app is **published** (design-time preview's iframe has no real origin, so it always errors there). The component renders `<Webcam>` directly and flips to a file-picker fallback on `onUserMediaError`; do not pre-probe `getUserMedia` yourself, it double-prompts and flickers the camera light. The fallback badge text differs by whether the build is the design-time preview (`isPreviewMount(import.meta.env.BASE_URL)`, covering both `/v1/dev/{session}/{app}/…` and `/v1/preview/{token}/dev/…`) or a real published build with no/blocked camera hardware — do not word the badge as if publishing would fix a published app's missing-camera case. The fallback's file input has no `capture` attribute — it's a plain gallery/file picker on every device, so never word UI copy as if it always means "camera"; a "Try camera again" control (hidden in design-time preview, where a retry can never succeed) resets back to the live path. Optional `videoClassName` overrides the default `w-full max-w-sm` viewfinder sizing (twMerge — later classes win); optional `videoConstraints` passes straight through to react-webcam (e.g. `{ facingMode: "environment" }` or a target resolution); optional `fallbackMessage` overrides the default badge text shown when there's no live camera — prefer these over hand-editing the component for a one-off size/lens/copy tweak.
- **@microsoft/managed-apps** — live M365 connector runtime. `generated/` (app root, sibling of `src/`; read-only — do not edit) holds the typed client and exists only in an app that carries a data-source binding; the runtime's typed `appbuilder-DataSourceAdd` tool is the only thing that adds a binding and generates it, `appbuilder-DataSourceRefresh` regenerates it for a binding the app carries, and `appbuilder-DataSourceRemove` deletes it (a connector's actions, or one table of any tabular connector — SharePoint list, SQL table, Dataverse table; only a SQL stored procedure as a data source is not offered). Spatial requests fail closed when no binding is available; for other sources, an app without one builds on realistic sample data. Never add sample/demo/mock/test-data provenance copy or UI treatment to the app; disclose each affected dataset or entity only in authoring chat.
- **tailwindcss** 4 — config-less; palette = CSS vars in `src/index.css` (see Theming).

## Structure

```
src/
├── App.tsx              Providers + router (BrowserRouter basename, QueryClientProvider, ErrorBoundary, ConfirmDialogProvider). LOCKED — don't edit.
├── main.tsx             Entry. LOCKED — don't edit.
├── routes.tsx           SINGLE source of truth for routes (+ nav label/icon). Add a page = ONE entry here.
├── index.css            Tailwind import + design tokens (oklch CSS vars). Theme here on build or restyle (see Theming).
├── components/
│   ├── app-shell.tsx        Minimal shell (owns the only min-h-screen, mounts <Toaster/>). Ships NO nav — add one per the app.
│   ├── camera-capture.tsx   <CameraCapture onCapture={…}/> — live viewfinder + file-picker fallback (see react-webcam above).
│   ├── error-boundary.tsx   App-level boundary (wired in App.tsx). Emits a fixed, detail-free crash signal to the host on render errors — LOCKED.
│   ├── confirm-dialog.tsx   <ConfirmDialogProvider> backing useConfirm().
│   ├── states.tsx           <EmptyState> / <ErrorState> / <LoadingState>.
│   ├── page-section.tsx     <PageSection> — heading + description + action + spacing.
│   ├── spatial-map.tsx      Protected Spatial Services map renderer — LOCKED, don't edit.
│   ├── internal/
│   │   └── spatial-tile-layer.ts Protected Spatial tile scheduler — LOCKED, don't edit.
│   ├── pdf-export-button.tsx <PdfExportButton> — bounded PDF download + optional connector-neutral callback. LOCKED.
│   ├── pen-input.tsx        <PenInput> — bounded pen/drawing input; app code owns saving. LOCKED — don't edit.
│   └── ui/                  shadcn/ui (new-york, Radix). Pre-installed — don't reimplement.
├── hooks/
│   ├── use-confirm.ts       useConfirm() — async confirm(): Promise<boolean>. Use instead of window.confirm.
│   └── use-mobile.ts        useIsMobile().
├── lib/
│   ├── utils.ts             cn().
│   ├── store.ts             zustand store (useAppStore) — first choice for global state.
│   ├── query-client.ts      shared TanStack Query client.
│   ├── pdf-export.ts        createPdfBlob() + PdfExportResult. LOCKED.
│   ├── safe-url.ts          safeUrl() — allowlist URL schemes before rendering links from untrusted/connector data.
│   ├── pen-input-value.ts   PenInputValue validation and PNG-to-Blob conversion. LOCKED — don't edit.
│   ├── spatial-tile-bytes.ts Protected binary tile validation and CSP-safe rendering — LOCKED, don't edit.
│   ├── console-capture.ts   Infra — LOCKED, don't edit. Also exports reportPrivateRuntimeError (private diagnostics only).
│   ├── cowork-parent-transport.ts  Infra — LOCKED, don't edit. Fixed, detail-free crash signal to the Cowork host.
│   ├── app-mounted-transport.ts    Infra — LOCKED, don't edit. Fixed-shape first-paint signal to the Cowork host.
│   ├── app-view-transport.ts       Infra — LOCKED, don't edit. Bounded app-view snapshot to the Cowork host.
│   ├── app-view-serializer.ts      Infra — LOCKED, don't edit. Accessible-name tree + route pattern; decides the app-view bound.
│   └── app-view-signal.tsx         Infra — LOCKED, don't edit. When the app-view snapshot is taken (mounted by App.tsx).
├── pages/
    ├── home.tsx             Home ("/") route. Rewrite in place; MUST keep `export function HomePage()` (routes.tsx imports it by name — renaming or `export default` only blanks the preview).
    └── not-found.tsx        404.
└── types/
    └── app-message.ts       Infra — LOCKED. Fixed parent-frame message contract.
```

`@/` → `src/`. Single-screen app → rewrite `home.tsx` in place (don't add a page). Multi-page → add a page file (named export) + one `routes.tsx` entry (`{ path, element, label?, icon? }` — `label`/`icon` optional, set them only for nav targets); don't hand-edit `<Routes>` in `App.tsx`. `generated/` (connector client) sits at the app root, sibling of `src/`.

## Conventions

- **Scaffold markers** — when you rewrite `src/pages/home.tsx`, delete the `/* APP_STUB_HOME_TSX_START */` / `/* APP_STUB_HOME_TSX_END */` comments. They mark the page as never rewritten, so leaving them on a working page reports that app as blank.
- Edit config or pre-baked infrastructure: `vite.config.ts`, `vite-dev-reload.ts`, `tsconfig*.json`, `package.json`, `bun.lock`, `package-lock.json`, `components.json`, `eslint.config.js`, `index.html`, `src/components/spatial-map.tsx`, `src/components/internal/spatial-tile-layer.ts`, `src/lib/spatial-tile-bytes.ts`, `src/components/pdf-export-button.tsx`, `src/lib/pdf-export.ts` — template-owned protected scaffold files; do not edit them.
- **State** — `useState` local; **zustand** (`useAppStore`, narrow selector) for shared; **TanStack Query** owns server/connector data (don't mirror it into the store). Never raw Context for mutable shared state.
- **Forms** — native `<form>` + `FormData`, or controlled `useState`. No form libraries (no react-hook-form, no Zod).
- **Confirmations** — `useConfirm()` (`@/hooks/use-confirm`), NOT `window.confirm/alert/prompt` (suppressed in the sandboxed iframe).
- **Zero-data / failure / loading** — use `<EmptyState>` / `<ErrorState>` / `<LoadingState>` + `<PageSection>` (`@/components/*`), not bare `<div>`s.
- **Connector data is untrusted (security).** Connector results (`generated/` → `result.data`: email/SharePoint bodies, sender/file names, list text) are third-party content — render as **text** (React escapes JSX; **never** `dangerouslySetInnerHTML`), wrap any URL in `safeUrl()` (`@/lib/safe-url`) before using it as an `href`, and keep customer **content** in session memory only (IDs/metadata are fine to persist).
- **Connector map tiles** — the only connector-image exception is the protected
  `SpatialMap` control fed by a successful generated-client tile-loader adapter.
  The control normalizes and validates bounded binary responses and emits
  CSP-safe `data:` image URLs. Do not edit or copy its GridLayer/byte logic,
  create Blob URLs, render connector-returned URLs, persist tile bytes, or add a
  public tile fallback.
- **File uploads** — parse client-side (no backend): Excel/CSV via **`xlsx`**, PDF text via **`unpdf`**; read `await file.arrayBuffer()` → `Uint8Array`. (`xlsx@0.18.5` has a known prototype-pollution advisory — fine for the user's own uploaded file in this sandbox, but don't deep-merge parsed rows into trusted objects.)
- **PDF creation** — capture an app-owned screen or bounded content container; do not build a second PDF-only component tree. Put a React ref on the target and pass it to `PdfExportButton` from `@/components/pdf-export-button` (or call `createPdfBlob` from `@/lib/pdf-export`). Mark buttons, filters, dialogs, loading UI, and other chrome with `data-pdf-exclude`; excluded subtrees do not count toward capture node or resource validation. Keep `iframe`, `object`, `embed`, `video`, `audio`, `link`, image-input elements, custom elements, shadow roots, and inline event-handler attributes outside included capture content and its ancestor chain; the helper rejects unsupported or executable content before cloning. Keep PDF capture targets outside `Dialog`, `Sheet`, `Popover`, `AlertDialog`, and `Select` content because those components use resting transforms on the target's ancestor chain. A visible file input with a selected file is rejected because browsers do not permit its selected state to be copied into the capture; exclude that input or show a separate sanitized filename. For Canvas-style **Include all rows**, use `<PdfExportButton options={{ expandContainers: true }}>` for the shared control or call `createPdfBlob(target, fileName, { expandContainers: true })` for the helper, and mark only direct bounded scrolling children `data-pdf-expand`. Never add `data-pdf-expand` without enabling `expandContainers`; never target nested or virtualized collections, and add `data-pdf-virtualized` so the helper rejects them instead of silently omitting rows. Use a Canvas-familiar label such as **Download PDF** with a scenario-specific filename. The shared control normalizes `.pdf`, bounds and validates output, serializes captures and callback handoffs, displays progress/errors, cleans up its temporary object URL, and optionally calls `onGenerated({ blob, fileName, byteLength, mimeType })`. Cowork grants downloads only in its canonical trusted `/dev/` preview tier; its strict untrusted tier remains unable to start programmatic downloads. The callback is only a connector-neutral handoff: never claim the PDF was saved until the exact connector operation succeeds. Use only app-local, data, blob, or same-origin image and font resources; remote cross-origin resources are rejected even when they advertise CORS. Require the user to narrow large date/data ranges and fail visibly rather than truncating. A standalone PDF deliverable belongs to the PDF artifact workflow, not App Builder.
- **Layout** — `min-h-screen` on the root only (`min-h-[100dvh]` for a full-height hero, not `h-screen`).
- **A11y** — `focus-visible:` ring, `aria-label` on icon-only buttons, real `<label>`s; `min-w-0` on flex children with truncatable text.
- **Sample data** — no round-number stats, no "John Doe", no emojis in headings/body; no copyright footers or fake login/profile buttons unless asked.

## Pen input

For pen drawing, including a drawn signature, approval mark, or field sign-off,
import
`PenInput` from `@/components/pen-input` and `PenInputValue`
or `penInputValueToBlob` from `@/lib/pen-input-value`. Never import
`signature_pad` directly or implement pointer/canvas drawing in the
generated page.

Generated app code belongs under `src/`; never create or place app code under
`.aether-container-tests`. Raw stroke capture is forbidden. A legitimate
non-drawing canvas must use JSX or a recognized React `createElement` call with
the literal `data-aether-canvas-purpose="non-drawing"` marker. The marker does
not permit pointer, mouse, or touch stroke-capture handlers. Global pointer, mouse, and touch listener registration is forbidden.
Imperative or dynamically constructed canvas forms are unsupported. A marked
non-drawing canvas may be accessed through a React ref or from another module
for non-interactive rendering, but pointer, mouse, or touch handlers must not
call stroke-path or canvas-export APIs. `bun run check` enforces this contract.

Hold `PenInputValue | null` in app state and pass it through `value` /
`onChange`. Track `onValidityChange` when a form owns hydrated values; require
both a non-null value and `isValid === true` before enabling submission. Treat
the value as customer content: keep it in session memory,
never put it in `localStorage`, logs, URLs, analytics, or parent-frame messages.
The shared control emits a bounded PNG data URL with dimensions and decoded
byte length; controlled images are limited to 8,192 pixels per edge and
16,777,216 total pixels before browser decode, and their inflated PNG
scanlines are limited to 4 MiB without inflating them on the interaction path.
The wrapper reduces effective device-pixel-ratio
resolution when needed so its own exported RGBA scanlines fit those same limits
while retaining the highest supported fidelity. `Clear drawing` emits `null`.
Synchronous validation verifies the PNG envelope, chunk CRCs, dimensions,
decoded-work bound, and exact end-of-file. The browser image decoder remains
the final authority for compressed image data and displaying the pixels. A
controlled validation or decode failure is surfaced locally without mutating
the caller's authoritative value.
The `required` prop marks the control visually but does not provide native form
constraint validation; when drawing is required, block submission in the owning
form unless its `PenInputValue` state is non-null and
`onValidityChange` reports true. Validate again at the app-owned save
boundary so a malformed hydrated value cannot be persisted.

Use the wrapper's explicit presentation props when the workflow needs a
different drawing surface: `width` (default `100%`) and `height` (default
`14rem`) set CSS dimensions; `penColor` (default black), `backgroundColor`
(default white for stable light/dark-theme contrast), `minStrokeWidth` (default `0.5`), and `maxStrokeWidth`
(default `2.5`) tune the drawing; `borderRadius`, `canvasClassName`, and
`canvasStyle` tune the canvas.
`maxBytes` defaults to `DEFAULT_PEN_INPUT_MAX_BYTES` (512 KiB) and may set a
lower connector-specific ceiling; values above that hard cap are rejected.
Color changes apply to subsequent strokes or a cleared surface; an existing
`PenInputValue` is an opaque PNG and is never recolored in place.
Keep sufficient pen/background contrast, positive stroke widths with
`minStrokeWidth <= maxStrokeWidth`, and a usable touch target. `canvasProps`
is for remaining safe canvas attributes; raw bitmap `width`/`height` stay
wrapper-owned so responsive device-pixel-ratio scaling remains correct.

The control does not save or verify identity. For a local prototype, a Save
action may copy the value into in-memory app state and must describe that
honestly. For a bound app, inspect the exact method under app-root `generated/`
before adapting the output: use `penInputValueToBlob()` only for a declared
binary/file input, and pass `dataUrl` only when the generated scalar type
explicitly accepts it. Check `IOperationResult<T>` and report failures; never
invent a binding, silently fall back to sample persistence, or claim that a
drawing was saved remotely without a successful operation.

### Connector-backed Spatial maps

Geographic map, address-search, location-finder, geocoded-marker, and geographic
pan/zoom requests use the pre-built `SpatialMap` from `@/components/spatial-map`
with a usable Spatial Services binding. Non-geographic charts, diagrams, image
pan/zoom, and timeline markers do not imply Spatial Services.
App code supplies a `SpatialTileLoader` that maps
`{ zoom, x, y }` to the exact local generated-service signature for
`GetMapTile` or `GetMapTileV2` and returns that operation result directly; never
guess parameter order, cast an unknown response, decode bytes, or call
`GetOrganizationSettings`.
The generated `subscription-key` parameter must always remain `undefined` for
every Spatial operation. Never supply an app-owned Azure Maps key, including
when troubleshooting failures; authentication belongs to the bound connection.

- **Markers and selection:** app code owns search text, the accessible result
  list, and selection. Import `SpatialMapMarker` and pass
  at most 500 `markers`, each with a stable, trimmed, case-sensitive string
  `id` of 1–128 Unicode code points, a nonblank label of at most 200 Unicode code points, and valid
  finite latitude/longitude values. Use `selectedId` plus `onLocationSelect`
  for app-owned selection and synchronize it with the accessible result list.
  Omitted or empty `markers` are valid, including loading/empty results;
  absent or stale selection ids simply highlight no marker. A single result
  uses the same collection API. Never derive identity from array position or
  coordinates.
- **Camera and events:** `bounds` takes precedence over `center`/`zoom`.
  Changing camera values moves the map without animation; unrelated rerenders
  and selection changes do not reset user panning. Selection never implicitly
  recenters the map. `onViewportChange` reports `{ center, zoom, bounds }`
  after map movement. `onInputRejected` returns a closed reason; invalid
  configuration disposes the map and shows an unavailable explanation until
  corrected.
- **Callback boundary:** selection and viewport callbacks contain copied plain
  DTOs only. Do not log, persist, analyze, parent-message, or augment them with
  Leaflet objects, DOM nodes, events, URLs, tile bytes, addresses, or
  coordinates. Markers already provide pointer, Enter, and Space selection with
  bounded text-only accessible names; do not replace that behavior.
- **Preview and published play:** both require a usable Spatial Services binding;
  a published user may still need per-user consent, so preview success does not
  prove that another user can load the published map. For an existing app, read
  `src/components/spatial-map.tsx` directly before use; if an older snapshot
  lacks it, stop and report that the protected control is unavailable rather
  than importing `leaflet` or recreating the wrapper.
- **Fallbacks:** a failed connection, search, tile request, validation, or render
  must show an unavailable/error state and stop further connector calls. The
  sole exception is scheduler overflow beyond 8 active plus 64 queued requests,
  shared across all map instances in the app page (including remounts):
  `capacity_exceeded` rejects only that tile and retains no deferred request
  queue. Once the shared queue is empty and an active slot is free, the layer
  removes capacity-rejected tiles from Leaflet's registry and requests the
  still-visible missing tiles.
  Visible overflow waiters fail visibly if shared capacity stalls.
  Never substitute sample coordinates, a public tile provider, raw HTTP, or a
  connector-returned URL.
  A tile request's 30-second deadline shows the unavailable state but does not
  cancel its loader. Timed-out calls still count toward the eight active calls
  until they settle; **Try again** waits for that capacity and keeps the
  unavailable explanation until a new tile is accepted. Queued retries share
  a 30-second stall deadline, reset on SDK settlement rather than enqueue.
  Healthy backlogs may wait longer; retry fails visibly if capacity stays
  occupied and cannot guarantee recovery of an uncancellable transport.
  After bytes arrive, image loading/decoding has its own 30-second deadline;
  a stalled image fails visibly without changing physical SDK-call permits.
  Removing a map detaches its pending rendering and callbacks, not the
  underlying calls or their permits.
- **Privacy and persistence:** `SpatialMap` persists nothing. Keep
  connector-derived addresses, coordinates, and tile bytes in session memory
  only; never put them in `localStorage`, analytics, logs, URLs, or parent-frame
  messages. Do not call `console.*` in Spatial search or tile error paths; show
  a fixed, user-safe error message in the app instead. Never persist tile bytes,
  create Blob URLs, or bypass the protected image validation.

## Theming

Grayscale by default — **every build adds color.** Single theme unless the user asks for dark mode. Turn-1 builds select one validated hue preset directly from the stable app UUID and apply that hue's matching canvas/card/edge atmosphere from `/opt/appbuilder/templates/v1/THEMING.md`; shape/type selection remains task-based. Paste the hue and atmosphere into all three `index.css` token blocks, including the row's Light Muted Text as `:root --muted-foreground`, apply the pack's radius and heading treatment, then accent inline with Tailwind utilities. **Turn-1 builds AND restyle / recolor iterates → prefer the current paste-able presets in `/opt/appbuilder/templates/v1/THEMING.md`; use the app-local `THEMING.md` only as a legacy fallback because template snapshots are not refreshed after creation** (retheme the `src/index.css` token blocks; don't derive OKLCH by hand).

**Tailwind v4 (config-less).** No `tailwind.config.js` — everything is in `src/index.css` (`@import "tailwindcss";`, tokens in `:root`/`.dark`, `@theme inline { --color-*: var(--*) }` maps vars → utilities). **Adding a token needs BOTH the `:root`/`.dark` var AND its `@theme` `--color-*` mapping** (a var with no mapping renders nothing). v3 habits that silently break: `bg-opacity-50`→`bg-black/50`, `shadow`→`shadow-sm`, `outline-none`→`outline-hidden`.


## Parent-frame message contract (LOCKED)

The preview runs inside an embedding **Cowork host** iframe. Hand-written template source has four parent-frame channels, all owned by infra files you must not edit:

- **Console forwarding** (`console-capture.ts`, unchanged legacy behavior): mirrors `console.log/warn/error` to the host preview panel. This is the existing, general channel. It resolves its target origin at runtime (env override → `ancestorOrigins` → same-origin fallback) — that resolution is grandfathered legacy behavior and must not be copied into new channels.
- **Runtime-error signal** (`cowork-parent-transport.ts`): a **fixed, detail-free** crash signal, sent by the ErrorBoundary for caught render crashes or by React's root `onUncaughtError` hook for uncaught root crashes.
- **App-mounted signal** (`app-mounted-transport.ts`): a **fixed-shape, detail-free** first-paint signal (`{ type: "app-mounted", timestamp }`), sent once from `main.tsx` after the first `requestAnimationFrame` following the initial render commit, so the host can measure real load latency instead of inferring it from the iframe's `load` event.
- **App-view snapshot** (`app-view-transport.ts`, fed by `app-view-serializer.ts` and scheduled by `app-view-signal.tsx`): a **bounded** report of what the user can see (`{ type: "app-view", v: 1, timestamp, route, tree, truncated }`), so the agent can ground on the screen the user is asking about. This is the ONE channel that carries app content by design. Its bound is the serialiser: `route` is the matched route PATTERN from `routes.tsx` (never the pathname, never params); `tree` is an accessible-name tree — roles, accessible names and visible text, one node per line, two spaces of indent per depth, `role: name` for elements and `"text"` (quoted) for text leaves so a parser can tell the two apart — with no attributes, no form-control values (a value-bearing control — `input`, `textarea`, `select`, `option`, `output`, `progress`, `meter` — never contributes to a computed name, so a wrapping `<label>` names it without its value, and a `contenteditable` region is a `textbox` control whose body never crosses), no link targets, no image sources, no ids/classes/`data-*`, no hidden subtrees (a hidden `<label>` or `aria-labelledby` target names nothing; CSS `display:none`/`visibility:hidden` count as hidden), cut at whole lines to 24,000 characters and capped in depth (transparent containers count toward the depth bound too) and node count. The serialiser reads DOM properties through exactly two casts (`.checked`, `.labels`), pinned by the guard; every other read is an allow-listed attribute. Emitted on the preview mount only (the orchestrator-baked `/v1/…` base; a deployed app never observes or posts), after a route change or a settled DOM mutation anywhere in `document.body` (so an open dialog, sheet or menu is in the tree), rate-floored, never on a timer alone; the host keeps only the latest and forwards it under the user's consent. Never emitted top-level.

**The runtime-error signal is immutable.** Both emitters call `postAppRuntimeErrorToCoworkParent()` with **no arguments**, and the template emits exactly:

    { type: "preview-error", code: "APP_RUNTIME_ERROR" }

Cowork receiver support for `APP_RUNTIME_ERROR` lands separately; until then,
the host safely ignores this code and its generic crash UI remains inactive.

**The app-mounted signal carries exactly one dynamic field.** `postAppMountedToCoworkParent()` takes **no arguments** and emits exactly:

    { type: "app-mounted", timestamp: <Date.now() at call time> }

`timestamp` is a clock reading, never customer content, route, URL, token, or `appId`.

Cowork's host-side listener for `{ type: "app-mounted" }` merged in `bic/cowork` PR #8401 (app-studio#2979 client-preview telemetry).

Hard rules (a security review depends on these; the Aether repo enforces them with `aether_runtime/tests/unit/app_builder/test_template_runtime_error_security.py`):

- **No dynamic data crosses to the parent** from the runtime-error or app-mounted paths beyond the single `timestamp` field above — no error `name`/`message`/`stack`, no React component stack, no route, URL, token, `appId`, or customer content. The app-view path is the only exception, and only within the serialiser's allow-list: a route PATTERN and the accessible-name tree. Nothing else — never `location.href`, never a form value, never an `appId`, never a token — may be added to that envelope; widening it is a security review, not an edit. `reportPrivateRuntimeError` writes to the pre-capture console implementation and makes a best-effort POST to `./__dev/console`; the runtime preview proxy forwards that POST to the dev server (#24067), but the channel stays best-effort — the log is absent until the first report lands and a restarting dev server drops reports — so repair logic must not assume `.browser-errors.log` exists.
- **No wildcard target origin.** `cowork-parent-transport.ts`, `app-mounted-transport.ts` and `app-view-transport.ts` post their messages to the SAME **explicit allow-list** of Cowork host origins (`COWORK_PARENT_ORIGINS`, exported from `cowork-parent-transport.ts`) and rely on Cowork pinning `event.source` to this iframe. Adding a supported host requires updating both that list and `EXPECTED_PARENT_ORIGINS` in the security guard — never add `"*"`, a suffix match, or a runtime-derived origin (`ancestorOrigins`, `document.referrer`, `location.origin`).
- **Top-level is a no-op.** When not embedded (`window.parent === window`), each sender does nothing.
- **Do not add another hand-written post-to-parent path.** In `src/`, `window.parent` / `window.top` / `postMessage` may appear only in the four transport infra files (`console-capture.ts`, `cowork-parent-transport.ts`, `app-mounted-transport.ts`, `app-view-transport.ts`). `app-view-serializer.ts` and `app-view-signal.tsx` never touch the parent; they only prepare and schedule the snapshot. New app code must never message the parent, and must never read the DOM to build a payload for the host — the serialiser is the one reader.
- **Bundled dependencies are outside this source contract.** In particular, `@microsoft/managed-apps` may transfer its connector `MessagePort` to the embedding host with a wildcard target origin on the no-bridge authoring path. The Aether source guard does not inspect dependency bundles and must not be treated as proving that only these four channels exist in the complete runtime.
- The in-frame fallback UI may still show the real local error message — that stays inside the iframe and never crosses to the host.
