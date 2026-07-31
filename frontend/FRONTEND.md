# DesignHive Admin — Frontend

**Stack:** plain HTML, CSS, and JavaScript. No framework, no build step, no `node_modules`.

The FastAPI backend mounts this directory as static files (`backend/main.py`), so
what is on disk is exactly what the browser gets. Editing a file and reloading is
the whole development loop.

**Run:** start the backend (`uvicorn main:app --reload` from `backend/`) and open
`http://localhost:8000`. `index.html` redirects to `/dashboard.html` or
`/login.html` depending on whether a token is stored.

---

## File structure

```
frontend/
├── index.html            # token check → dashboard or login
├── login.html            # the only unauthenticated page
├── dashboard.html        # stats, draft approvals, AI assistant, template table
├── templates.html        # template CRUD + Quill editor + email preview
├── campaign.html         # template + segment → send or schedule
├── users.html            # recipient list and direct send
├── agents.html           # trigger and inspect the automated agents
├── logs.html             # send history with filters
├── settings.html         # admin accounts and password change
│
├── css/
│   └── app.css           # the entire stylesheet — tokens, shell, components
│
├── js/
│   ├── auth-guard.js     # redirects to login when no token (loads in <head>)
│   ├── icons.js          # self-hosted icon set + lucide-compatible shim
│   ├── axios.min.js      # vendored HTTP client
│   ├── api.js            # axios config, auth header, 401 handling, api.get/post/…
│   ├── utils.js          # escapeHtml, formatDate, formatDateTime, debounce
│   ├── toast.js          # Toast.success / .error / .info / .warn
│   ├── layout.js         # sidebar, topbar, command palette, welcome overlay
│   ├── login.js
│   └── <page>-page.js    # one script per page
│
└── assets/
    ├── brand/            # logo-mark.png (sidebar/login), favicon.png
    └── images/email/     # hero art referenced by email templates
```

### Why no framework

The admin surface is seven pages of forms and tables against a REST API. A
framework would add a build step, a dependency tree, and a deploy artifact
without changing what the user sees. Everything here is served as-is.

The trade-off is that each page repeats its `<head>` and script tags. That
duplication is deliberate and bounded — if it grows past this, a small static
include step is the next move, not a framework.

---

## Script load order

Every authenticated page loads the same block, in this order, at the end of
`<body>`:

```html
<script src="/js/icons.js"></script>     <!-- defines window.lucide -->
<script src="/js/axios.min.js"></script>
<script src="/js/api.js"></script>       <!-- needs axios -->
<script src="/js/utils.js"></script>     <!-- needs nothing; used by everything below -->
<script src="/js/toast.js"></script>
<script src="/js/layout.js"></script>    <!-- needs icons + utils -->
<script src="/js/<page>-page.js"></script>
```

`auth-guard.js` is the exception: it loads in `<head>`, before anything renders,
so an unauthenticated visitor is redirected without a flash of the dashboard.

Pages that need them add `quill` (templates) and `sweetalert2` (templates,
campaign, settings) above that block.

---

## `js/icons.js` — the icon set

Pages previously pulled `lucide@latest` (~1 MB UMD) from unpkg on every load.
This module ships the 40 icons the app actually uses — about 9 KB of inline SVG
path data — with the same public surface:

```js
lucide.createIcons();                  // swap every [data-lucide] for its <svg>
lucide.createIcons({ root: element }); // scope it to a subtree
lucide.iconMarkup('send', 18);         // an <svg> string, for templates
```

`createIcons()` marks what it renders, so the repeated calls pages make after
each re-render only touch new placeholders. Placeholder attributes (`id`,
`title`, `style`, `class`) carry across to the rendered `<svg>`.

**To add an icon:** copy the inner markup of the Lucide SVG into the
`ICON_PATHS` map at the top of the file, keyed by icon name.

---

## `css/app.css` — the stylesheet

One file, ordered: tokens → reset → shell → components → pages → responsive.

### Tokens

All colour, radius, and layout values are custom properties in `:root`.
`.app-shell` re-points the background tokens to true black — the login screen
keeps the navy palette, the signed-in app is black. Nothing else redefines them.

### Layout rules worth knowing

- **The topbar owns the page heading.** `layout.js` renders the title and
  subtitle from `PAGE_META`. Pages must not repeat their own name in the body —
  `.page-header` is for filters and actions only.
- **`.mobile-menu-btn` is declared hidden before the media query** that shows it,
  so the responsive rule wins on source order rather than `!important`.
- **The collapsed sidebar rail is inside `@media (min-width: 768px)`.** Below
  that the sidebar is an off-canvas drawer that always shows full labels.

### Page-specific styles

Live at the bottom of `app.css` under a heading, not in an inline `<style>` in
the HTML. Inline blocks caused a late reflow and let page rules quietly
override shared components (agents.html used to redefine `.form-control`
globally).

---

## `js/layout.js` — the app shell

Renders into the empty `#sidebar` and `#topbar` that every authenticated page
ships, so navigation is defined once.

- **`NAV_GROUPS`** — the sidebar, grouped Overview / Messaging / Operations.
  Add a page here and it appears in the nav *and* the command palette.
- **`PAGE_META`** — title and subtitle per path, also used for `document.title`.
- **Sidebar collapse** — toggles `body.sidebar-collapsed`, persisted in
  `localStorage` under `sidebarCollapsed`.
- **Command palette** — `⌘K` / `Ctrl+K`, or the topbar button. Searches every
  nav destination plus the quick actions in `COMMAND_ACTIONS`; arrow keys and
  Enter to run, Escape to close.

Quick actions deep-link with query parameters the target page reads:
`templates.html?new=1` opens the editor, `logs.html?status=failed` lands
pre-filtered.

---

## `js/api.js` — HTTP

`API_BASE` is `window.ENV_API_URL` or `/api`. A request interceptor attaches the
bearer token; a response interceptor clears the token and redirects to login on
`401`. Use the `api` helpers rather than axios directly — they unwrap `.data`:

```js
const templates = await api.get('/templates');
await api.post('/agents/chat', { message });
```

---

## Template hero media

The generated email marks its hero element with `class="dh-hero-img"` — see
`build_text_email_html()` in `backend/email_direct_template.py`. **That marker is
the contract.** `templates-page.js` uses it to read the current hero and to
replace it, which is what keeps an edit off the branded header image, the four
social icons, and the footer.

Consequences worth knowing before changing either side:

- An image hero and a video hero are mutually exclusive, matching the
  generator. Setting one removes the other, row and all.
- When a template has no hero yet, a new one is inserted as a `<tr>` at the top
  of the white content table (`<td class="content-td"><table …>`), not appended
  after `<body>`. Loose media there renders above the branded header and
  outside the layout table.
- If a hero points at a URL that is not in the asset library, the picker gains
  a one-off "(in use)" option so it shows the real state rather than reading as
  "no image set".
- `__remove__` (`REMOVE_MEDIA`) is the picker value that clears a hero. An empty
  value means "keep whatever the template already has".

If you change the marker class in the backend template, update the `HERO_*`
regexes in `templates-page.js` in the same commit.

---

## Asset uploads

`POST /api/assets/images` takes the raw file as the request body with the name
in an `X-Filename` header. It handles video as well as images — the extension
decides which limit applies.

- Limits live on the backend (`routes/assets.py`) and are served by
  `GET /api/assets/limits`. The frontend fetches them at boot, validates
  `file.size` before spending an upload, and renders them into every
  `[data-upload-hint]` element. The values in `uploadLimits` are only a fallback
  for when that request fails.
- Current ceilings: **10 MB** for images, **50 MB** for video. Change them in
  `routes/assets.py`; the UI follows automatically.
- Content type is derived from the extension server-side, never trusted from the
  client, so an upload cannot be stored as `text/html` and served as a page from
  the public bucket URL.
- Filenames are sanitised, and an upload never overwrites an existing asset —
  a colliding name becomes `name-2.ext`. Replacing in place used to silently
  change every template already pointing at that name.
- Supabase enforces its own per-bucket ceiling, which can be lower than ours. If
  storage rejects a file that passed our check, the route returns a 413 saying
  so rather than a raw driver error.

---

## `js/utils.js` — shared helpers

`escapeHtml`, `formatDate`, `formatDateTime`, `errorMessage`, `debounce`.

**Always `escapeHtml()` any API value interpolated into a template string.**
Pages build markup with template literals, so unescaped values are an injection
path. This used to be six near-identical copies across page scripts; it is one
now.

---

## Accessibility

- Each page opens with a skip link to `#main-content`.
- The active nav item carries `aria-current="page"`; the sidebar is a `<nav>`
  with a label; the mobile toggle tracks `aria-expanded`.
- The topbar `<h1>` is the page's only top-level heading.
- Icon-only buttons need an `aria-label` — rendered `<svg>`s are `aria-hidden`.
- `@media (prefers-reduced-motion: reduce)` disables animation globally.

---

## Known trade-offs

- **Quill and SweetAlert2 load from a CDN**, unpinned at the major version.
  `templates-page.js` degrades to the raw HTML editor if Quill fails to arrive,
  but self-hosting both (as `icons.js` now does) would remove the third-party
  dependency and allow subresource integrity. That is the next cleanup.
- **`<head>` and the script block are duplicated across eight pages.** See
  "Why no framework" above.
