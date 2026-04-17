# DesignHive Admin — Frontend Documentation

**Stack:** Next.js 14 (Pages Router) · React 18 · Bootstrap 5 · Axios · Lucide Icons

**Run:** `npm install` → `npm run dev` (from `frontend/`)

**Dev URL:** `http://localhost:3000`  
**Backend expected at:** `http://localhost:8000/api` (configurable via `NEXT_PUBLIC_API_URL`)

---

## File Structure

```
frontend/
├── package.json
├── next.config.mjs
├── styles/
│   └── globals.css
├── services/
│   └── api.js
├── pages/
│   ├── _app.jsx
│   ├── index.jsx
│   ├── login.jsx
│   ├── dashboard.jsx
│   ├── users.jsx
│   ├── templates.jsx
│   ├── campaign.jsx
│   ├── logs.jsx
│   └── settings.jsx
└── components/
    └── Layout.jsx
```

---

## Why Next.js (Pages Router)?

Next.js was chosen over plain React + Vite for one key reason: **zero routing configuration**. Every file in `pages/` automatically becomes a route — no `react-router-dom`, no `<Route>` definitions, no `BrowserRouter` wrapper. This eliminates an entire config layer and 1 dependency.

The **Pages Router** (not the newer App Router) was chosen because:
- It is simpler and more predictable for an admin dashboard with no SSR requirements
- `_app.jsx` gives a single place to handle global auth, layout, and CSS
- `getServerSideProps` on `index.jsx` gives an instant server-level redirect with zero client JS

---

## `package.json`

Defines the project metadata and all runtime dependencies.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Starts Next.js dev server on port 3000 with hot module replacement |
| `npm run build` | Compiles and optimises the app for production |
| `npm start` | Runs the compiled production build on port 3000 |
| `npm run lint` | Runs Next.js's built-in ESLint rules |

### Dependencies (7 packages)

| Package | Version | Purpose |
|---|---|---|
| `next` | 14.2.15 | Framework — routing, SSR, build system |
| `react` | 18.3.1 | UI library |
| `react-dom` | 18.3.1 | React's DOM renderer |
| `axios` | 1.7.7 | HTTP client for all API calls to the FastAPI backend |
| `bootstrap` | 5.3.3 | CSS utility classes, grid, and base component styles |
| `lucide-react` | 0.454.0 | Icon library — tree-shakeable, each icon is a React component |
| `react-quill-new` | 3.3.0 | Rich-text HTML editor used on the Templates page |
| `react-hot-toast` | 2.4.1 | Lightweight toast notification system |
| `sweetalert2` | 11.14.1 | Styled modal confirmation dialogs |

**What was intentionally dropped vs the old frontend:**
- `framer-motion` — removed, no animations needed
- `datatables.net-react` — removed, replaced with a simple built-in table + client-side search
- `react-bootstrap` — removed, plain Bootstrap CSS classes are used directly
- `recharts` — removed, the Analytics page was never implemented
- `react-hook-form` — removed, native React `useState` is sufficient for these simple forms

---

## `next.config.mjs`

Minimal Next.js configuration file.

```js
const nextConfig = {
  reactStrictMode: true,
};
```

`reactStrictMode: true` makes React intentionally double-invoke certain functions (render, effects) in development to surface bugs caused by side effects. It has no effect in production builds. Nothing else is configured here — Next.js's defaults handle everything the app needs.

---

## `styles/globals.css`

The entire visual system for the application. Imported once in `_app.jsx` and applied globally. All custom classes used across every page are defined here — no page has its own `<style>` block or CSS module.

### CSS Variables

Defined on `:root` so every file can reference them:

```css
--bg-deep:    #0A0A0F   /* darkest background — main content area */
--bg-section: #161A23   /* sidebar background */
--bg-card:    #11131A   /* card and modal backgrounds */
--bg-input:   #0F172A   /* form input backgrounds */
--gold:       #FACC15   /* primary accent colour */
--gold-glow:  rgba(250, 204, 21, 0.2)   /* glow/shadow colour */
--gold-dim:   rgba(250, 204, 21, 0.08)  /* subtle gold background tint */
--border:     rgba(255, 255, 255, 0.05) /* subtle dividing lines */
--text-muted: #9CA3AF   /* secondary text colour */
```

Changing any of these updates the entire UI. For example, swapping `--gold` to a blue would re-theme every button, active nav link, badge, and icon accent in the app.

### App Shell

The outer layout structure. The app renders as a full-viewport flex row:

- `.app-shell` — `display: flex; height: 100vh; overflow: hidden` — the outer container. Nothing scrolls at this level.
- `.sidebar` — fixed 240px width left column, `flex-shrink: 0`, dark section background, right border.
- `.sidebar-logo` — top section of the sidebar with bottom border.
- `.sidebar-nav` — flex-grows to fill available space, scrollable if nav items overflow.
- `.sidebar-footer` — pinned to the bottom of the sidebar with a top border, holds the Sign Out button.
- `.main-area` — takes up all remaining width (`flex: 1`), itself a vertical flex column.
- `.topbar` — fixed-height bar at the top of the main area, uses `backdrop-filter: blur(12px)` for the frosted-glass effect.
- `.page-content` — the only scrollable area in the app. `flex: 1; overflow-y: auto` — this is where all page content renders.

### Navigation Links

`.nav-link` is the base class for all sidebar links and the Sign Out button:
- Default: muted text, transparent background
- `:hover` — subtle white background tint, white text
- `.active` — solid gold background, black text and icon
- `.logout` — red text, red-tinted hover background

### Cards

`.glass-card` — dark card background (`--bg-card`), subtle border (`--border`), 16px border radius. Used for every content container across all pages.

### Buttons

- `.btn-primary` — overrides Bootstrap's default blue. Gold background, black bold text, gold glow shadow. Applied to all primary action buttons (Save, Send, Sign In, etc.)
- `.btn-secondary-dark` — subtle dark background with a white-tinted border. Used for Cancel, Refresh, and secondary actions.
- `.btn-icon-close` — small square button used for modal close buttons and icon action buttons (Edit, Delete, Preview). Semi-transparent background that darkens on hover.

### Forms

Bootstrap's form controls are white by default. These overrides make them match the dark theme:
- `form-control` / `form-select` — dark input background, subtle border, white text
- `:focus` state — gold-tinted border (40% opacity), subtle gold box-shadow glow
- `::placeholder` — muted grey at 50% opacity

`.input-icon-wrap` is a custom compound input component (not a Bootstrap class):
- A flex row with a fixed icon slot on the left and an unstyled `<input>` on the right
- The entire row has the border and background, not the individual input
- `:focus-within` applies a gold border when the input inside is focused
- Used on Login (email/password), Users (search), Logs (filters), and Settings (OTP/password fields)

### Tables

Overrides Bootstrap table variables to apply the dark theme:
- `--bs-table-bg: transparent` — no table background, shows through to the card background
- `--bs-table-color: #fff` — white cell text
- `--bs-table-border-color: var(--border)` — subtle row separators
- `thead th` — muted text, 0.72rem, uppercase, 0.08em letter-spacing

### Badges

Four pre-built status badges, used in Logs and Settings:

| Class | Color | Used for |
|---|---|---|
| `.badge-sent` | Gold | Sent email status |
| `.badge-failed` | Red | Failed email status |
| `.badge-active` | Green | Active admin accounts |
| `.badge-inactive` | Red | Deactivated admin accounts |

### Modal System

A complete reusable modal shell used identically across Users, Templates, and Settings pages:

- `.modal-overlay` — fixed full-viewport backdrop with dark semi-transparent blur. Clicking outside the box closes the modal (event target comparison in JSX).
- `.modal-box` — the white-bordered dark card, `display: flex; flex-direction: column`.
- `.modal-header-bar` — top section with title and close button, bottom border.
- `.modal-body-pad` — scrollable content area with consistent padding.
- `.modal-footer-bar` — bottom section with action buttons, top border, right-aligned flex row.

### Quill Editor

Fixes Quill's default white toolbar and removes its borders so it integrates with the dark modal cards:
- `.ql-toolbar` — keeps white background (needed for toolbar icons to be visible), 10px top radius
- `.ql-container` — removes all borders, sets minimum height to 260px

### Loading States

- `.skeleton` — shimmer animation using a gradient that moves left to right. Applied to placeholder divs while data is loading. Used on every page.
- `.spin` — continuous rotation animation used on refresh/loading icons.

### Utility Classes

| Class | Effect |
|---|---|
| `.text-gold` | `color: var(--gold)` |
| `.bg-gold` | `background-color: var(--gold)` |
| `.shadow-gold` | Gold glow box-shadow |
| `.cursor-pointer` | `cursor: pointer` |
| `.label-upper` | 0.72rem, uppercase, 0.08em tracking, muted colour — used for all form labels and section headings |
| `.line-clamp-2` / `.line-clamp-3` | Truncates text to 2 or 3 lines with an ellipsis |

---

## `services/api.js`

A pre-configured Axios instance that every page imports instead of creating its own. Centralises the base URL and authentication logic so no page handles these directly.

### Base URL

```js
baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'
```

In development, all requests go to `http://localhost:8000/api`. For production, create a `.env.local` file in the `frontend/` directory:

```
NEXT_PUBLIC_API_URL=https://admin.designhivestudio.ai/api
```

Next.js automatically exposes variables prefixed with `NEXT_PUBLIC_` to the browser. No rebuild is needed when switching environments — just update `.env.local`.

### Request Interceptor

Runs before every outgoing request:

```js
const token = localStorage.getItem('adminToken');
if (token) config.headers.Authorization = `Bearer ${token}`;
```

The `typeof window !== 'undefined'` guard prevents this code from running during Next.js's server-side render phase — `localStorage` doesn't exist on the server and would throw a `ReferenceError` without this check.

### Response Interceptor

Runs after every incoming response:

- **Success (2xx)** — passes the response through unchanged.
- **Error 401** — clears `adminToken` from localStorage and hard-redirects to `/login` using `window.location.href`. This handles expired tokens globally. Any page that makes an API call is automatically protected — if the token expires mid-session, the user is redirected to login without any per-page handling.
- **Other errors** — re-throws the error so individual pages can handle them with `toast.error()`.

---

## `pages/_app.jsx`

Next.js's global application wrapper. Every page in `pages/` is rendered through this component. It is the single source of truth for global CSS, auth state, and layout assignment.

### Global CSS Imports

```js
import '../styles/globals.css'          // dark theme + custom classes
import 'bootstrap/dist/css/bootstrap.min.css'  // Bootstrap utility classes
import 'react-quill-new/dist/quill.snow.css'   // Quill editor styles
```

These three imports apply to every page. They are placed here so they are imported exactly once — not repeated across individual pages.

### Authentication Guard

A `useEffect` runs on every route change (via `router.pathname` as a dependency):

1. Reads `adminToken` from `localStorage`.
2. If there is no token and the current page is not `/login` → redirects to `/login`.
3. If there is a token and the current page is `/login` → redirects to `/dashboard` (prevents a logged-in user from seeing the login page).
4. If neither redirect condition is met → sets `ready = true` to allow render.

### Flash Prevention

The `ready` state starts as `false`. The component returns a plain dark `<div>` (matching `--bg-deep`) until the auth check completes. Without this, there is a brief flash where the protected page content renders before the redirect fires — especially noticeable on fast connections. The dark div is invisible to the user, making the auth check seamless.

### Conditional Layout

Public pages (`/login`) render without any chrome:
```jsx
return <><Toaster /><Component {...pageProps} /></>
```

All other pages render inside the `<Layout>` component:
```jsx
return <Layout><Toaster /><Component {...pageProps} /></Layout>
```

`<Toaster>` is rendered in both branches so toast notifications work on every page including the login page (e.g., for "Invalid password" errors).

### Toast Styling

```js
toastOptions={{ style: { background: '#11131A', color: '#fff', border: '1px solid rgba(255,255,255,0.08)' } }}
```

All toasts are styled to match the dark card theme consistently.

---

## `components/Layout.jsx`

The persistent sidebar + topbar shell that wraps every authenticated page. Receives `{children}` from `_app.jsx` and renders the page content inside `.page-content`.

### NAV Array

```js
const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/users',     icon: Users,           label: 'Users' },
  { href: '/templates', icon: FileText,         label: 'Templates' },
  { href: '/campaign',  icon: Send,             label: 'Campaign' },
  { href: '/logs',      icon: History,          label: 'Logs' },
  { href: '/settings',  icon: Settings,         label: 'Settings' },
];
```

Adding or removing a nav item is a single array entry change. The active state is determined at render time by comparing `router.pathname` to each item's `href`. The matching item receives the `active` CSS class (gold background).

### PAGE_TITLES Object

Maps pathnames to human-readable page titles shown in the topbar:
```js
const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/users':     'Users',
  ...
};
```

### Sidebar Structure

1. **Logo** — text-based "Design**Hive**" with gold highlight on "Hive", "Admin Panel" subtitle in muted text.
2. **Nav links** — rendered from the `NAV` array using Next.js `<Link>` for client-side navigation (no page reload, no network request for the page shell).
3. **Sign Out** — button at the bottom that calls `localStorage.removeItem('adminToken')` then `router.replace('/login')`.

### Topbar

- Left: current page title from `PAGE_TITLES` lookup.
- Right: a small gold "ADMIN" pill badge.

---

## `pages/index.jsx`

The root URL `/`. Uses `getServerSideProps` for an immediate server-level redirect:

```js
export async function getServerSideProps() {
  return { redirect: { destination: '/dashboard', permanent: false } };
}
```

This redirect happens on the server before any HTML is sent to the browser — no JavaScript runs, no flash of content. The `_app.jsx` auth guard then handles whether `/dashboard` is accessible (redirects to `/login` if not authenticated).

---

## `pages/login.jsx`

The only public page — no sidebar or topbar, renders standalone centered on the dark background.

### Layout

- Full-viewport dark screen (`var(--bg-deep)`), vertically and horizontally centered.
- A single `.glass-card` (max-width 420px) with the logo, email field, password field, and submit button.

### Form Fields

Both fields use the `.input-icon-wrap` compound input pattern from `globals.css` — a flex container with a gold icon on the left and a plain `<input>` on the right. This avoids Bootstrap's `input-group` component which requires more markup and has styling conflicts with the dark theme.

### Submit Flow

1. `e.preventDefault()` stops the native form submission.
2. Sets `loading = true` — the button shows a Bootstrap `spinner-border`.
3. POSTs `{ email, password }` to `/api/auth/login`.
4. On success: stores the returned JWT as `adminToken` in `localStorage`, then calls `router.replace('/dashboard')`. Using `replace` instead of `push` means the login page is removed from browser history — the Back button won't return to it.
5. On error: shows `err.response?.data?.detail` as a toast (the FastAPI backend returns the error message in the `detail` field).

---

## `pages/dashboard.jsx`

The first page shown after login. Gives an at-a-glance view of the system's email activity.

### Data Fetching

Three API calls run in parallel with `Promise.all` on mount:
```js
Promise.all([api.get('/templates'), api.get('/logs'), api.get('/users')])
```

This is faster than three sequential awaits. The four stat values are derived from the responses:
- **Emails Sent** — `logs.filter(l => l.status === 'sent').length`
- **Failed Emails** — `logs.filter(l => l.status === 'failed').length`
- **Templates** — `templates.length`
- **Total Users** — `users.length`

### Stat Cards

A `CARDS` array maps each stat to a label, value, icon, and accent colour. Rendered in a responsive Bootstrap row: 2 columns on mobile (`col-6`), 4 columns on desktop (`col-lg-3`).

### Loading State

While data is fetching, four skeleton shimmer divs replace the stat cards and a single skeleton replaces the campaigns table. The skeleton uses the CSS shimmer animation from `globals.css`.

### Campaigns Table

Lists all templates (the "campaigns" concept) with their name, subject line, and creation date. The date is formatted using `toLocaleDateString('en-AU', ...)` for Australian-style dates (e.g., "15 Jan 2025").

### Send Campaign Button

A shortcut in the header that calls `router.push('/campaign')` — navigates to the Campaign page without a page reload.

---

## `pages/users.jsx`

Two components defined in one file: `SendEmailModal` and the main `Users` page.

### `SendEmailModal`

A modal that opens when "Send Email" is clicked on a user row. Allows sending a one-off email with optional file attachments directly to that user.

**Props:** `{ user, onClose }` — `user` has `email` and `name`.

**Fields:**
- Subject (required text input)
- Message (required textarea, `resize: vertical`)
- Attachments (hidden file input, triggered by a styled button)

**File Attachment Handling:**

```js
const toBase64 = file => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(',')[1]);  // strips "data:mime/type;base64," prefix
  r.onerror = rej;
  r.readAsDataURL(file);
});
```

Files are read with the `FileReader` API. The data-URI prefix is stripped — only the raw base64 string is sent. Multiple files can be added incrementally (each `onChange` appends to the existing array). Each file shows its name, formatted file size, and a delete button.

**API Call:**

```js
await api.post('/email/send-direct', {
  to: user.email,
  subject,
  body: body.replace(/\n/g, '<br>'),  // converts newlines to HTML line breaks
  attachments: [{ name, mime_type, data }],
});
```

### `Users` (main page)

**Data:** Fetches `GET /users` on mount. Users are ordered by `created_at` descending (newest first) — this ordering is done by the backend.

**Client-side search:**
```js
const filtered = users.filter(u =>
  (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
  (u.email || '').toLowerCase().includes(search.toLowerCase())
);
```

Searches both name and email fields simultaneously. Resetting `page` to 1 on each keystroke prevents the case where you're on page 3, type a search term, and see an empty page.

**Pagination:**
- `PER_PAGE = 10` rows per page.
- `paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)`
- Pagination controls (Prev/Next + row count) only render when `totalPages > 1`.
- Page resets to 1 when the search term changes.

**Table columns:** Name (bold white), Email (gold), Joined (muted, formatted date), Action (Send Email button with gold styling).

---

## `pages/templates.jsx`

Three components in one file: `TemplateModal`, `PreviewModal`, and the main `Templates` page. ReactQuill is imported with `dynamic()` to disable server-side rendering.

### `ReactQuill` Dynamic Import

```js
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
```

Quill uses `document` and `window` internally. During Next.js's server-side render phase these globals don't exist, which would cause a build error. `{ ssr: false }` tells Next.js to skip this module on the server and only load it in the browser. The component renders `null` on the server and the real editor on the client.

### `TemplateModal`

Handles both **creating** (when `template` prop has no `id`) and **editing** (when `template` prop has an `id`). This is determined by `const isEdit = !!template?.id`.

**Fields:**
- Template Name (required)
- Email Subject (required)
- Email Body — togglable between Quill visual editor and raw HTML textarea

**HTML Toggle:**

```js
const [htmlMode, setHtmlMode] = useState(false);
```

A button in the label row switches between modes. When `htmlMode` is `false`, the Quill editor renders. When `true`, a `<textarea>` with `font-monospace` and `resize: vertical` renders instead. Both are bound to the same `form.body` state — switching modes preserves the content.

**Variable Hints:**

Below the editor, `{{name}}`, `{{email}}`, `{{date}}` are shown as gold `<code>` tags. These are purely informational — the backend substitutes them when sending.

**Save Logic:**

```js
if (isEdit) {
  await api.put(`/templates/${template.id}`, form);
} else {
  await api.post('/templates', form);
}
```

After saving, calls `onSaved()` (which re-fetches the template list) then `onClose()`.

### `PreviewModal`

Renders the template HTML in a simulated email client — white card on a light grey background. Before rendering, substitutes the three variables with sample bold/italic values using `String.replace()`. Uses `dangerouslySetInnerHTML` — this is safe because the content is created by the admin, not by external users.

### `Templates` (main page)

**`editTarget` state** uses three distinct values:
- `undefined` — modal is closed, no template is being edited
- `null` — modal is open in "create new" mode
- `{ id, title, subject, body }` object — modal is open in "edit" mode

**Template Cards:**

Each card shows the template title, subject, a 140-character plain-text preview (HTML stripped with `.replace(/<[^>]*>/g, '')`), and three icon buttons. The preview text is also clickable to open the preview modal.

**Delete:**

SweetAlert2 dark confirmation dialog. On confirm, calls `DELETE /templates/:id` and immediately removes the template from local state with `.filter()` — no re-fetch needed.

---

## `pages/campaign.jsx`

A two-step bulk email send interface.

### State

```js
const [selectedTemplate, setSelectedTemplate] = useState(null);  // template ID string
const [selectedUsers, setSelectedUsers] = useState([]);           // array of user ID strings
const [results, setResults] = useState(null);                     // null = hidden, array = show results
```

### Step 1 — Template Selection

A scrollable list of template buttons. Each button displays the template name and subject. Clicking selects it — a single `setSelectedTemplate(t.id)` replaces the previous selection. The selected button gets gold background and black text via inline styles.

### Step 2 — Recipient Selection

A table with checkboxes. Two selection mechanisms work together:

**Individual toggle:**
```js
const toggleUser = (id) => setSelectedUsers(p =>
  p.includes(id) ? p.filter(x => x !== id) : [...p, id]
);
```

**Select All:**
```js
const toggleAll = (e) => setSelectedUsers(e.target.checked ? users.map(u => u.id) : []);
const allSelected = users.length > 0 && selectedUsers.length === users.length;
```

Clicking a table row also toggles its checkbox (the row has `onClick={() => toggleUser(u.id)}`). The checkbox cell has `onClick={e => e.stopPropagation()}` to prevent double-toggling when clicking directly on the checkbox.

### Send Flow

1. Validates that both a template and at least one user are selected.
2. SweetAlert2 confirmation shows the template name and user count.
3. On confirm: POSTs `{ template_id, user_ids }` to `/email/send`.
4. Sets `results` to the returned array.
5. Shows a toast: full success message or partial warning with counts.

### Results Panel

Appears below the send button after a successful (or partial) send. Shows:
- A gold stat box (sent count) and a red stat box (failed count)
- A scrollable per-email list with each address, a status icon (✓ gold / ✗ red), and any error message for failed sends
- A Dismiss button that sets `results = null` to hide the panel

### Send Button Label

```jsx
<>Send to {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}</>
```

Dynamically shows the current selected user count and correctly pluralises "user/users". Disabled when `sending || !selectedTemplate || selectedUsers.length === 0`.

---

## `pages/logs.jsx`

Full email delivery history with client-side filtering.

### Data

Fetches `GET /logs` on mount. The backend returns logs ordered by timestamp descending (newest first), with each row containing a nested `email_templates` object from a Supabase join:

```json
{
  "id": "...",
  "user_email": "john@example.com",
  "template_id": "...",
  "email_templates": { "title": "Welcome Email" },
  "status": "sent",
  "timestamp": "2025-01-15T10:30:00Z",
  "error_message": null
}
```

The template title is accessed as `l.email_templates?.title` — the optional chaining handles the case where a template was deleted after the log was created.

### Filtering with `useMemo`

```js
const filtered = useMemo(() => {
  // filter by status and date range
}, [logs, statusFilter, dateFilter]);
```

`useMemo` recomputes the filtered array only when `logs`, `statusFilter`, or `dateFilter` changes. Without it, the filter would re-run on every render including unrelated state changes.

**Date filter logic:**
- `today` — `new Date(l.timestamp) >= today` where `today` has time zeroed to midnight
- `yesterday` — timestamp falls between yesterday midnight and today midnight
- `all` — no date filter applied

**Status filter:** Simple equality check `l.status === statusFilter`.

### Summary Counts

The `sentCount` and `failedCount` values are computed from the **unfiltered** `logs` array (not `filtered`). This means the totals always show the overall picture regardless of what filters are active.

### Refresh

The `fetchLogs(showSpinner)` function accepts a flag. On initial load `showSpinner` is `false` (uses the skeleton). On Refresh button click `showSpinner` is `true` (sets `refreshing = true` which spins the Refresh icon without showing the skeleton loading state again).

---

## `pages/settings.jsx`

Three components in one file: `ChangePassword`, `AdminManagement`, and the main `Settings` page which simply composes both sections.

### `ChangePassword`

**`step` state:** `'idle'` | `'sent'`

**Idle state:**
- Description text explaining that a code will be emailed.
- "Send Reset Code" button → calls `POST /auth/reset-request`.
- The backend identifies which admin to send to via the JWT (no email input needed).

**Sent state:**
- Verification Code input (maxLength 6, numeric).
- New Password and Confirm Password fields sharing a single show/hide toggle (`showPw` state).
- Client-side validation before the API call: passwords must match and be at least 8 characters.
- `POST /auth/reset-password` with `{ otp, new_password }`.
- On success: resets all fields and returns to `idle` state.
- Cancel button: returns to `idle` state without clearing anything (user can re-request if needed).

### `AdminManagement`

**Current Admin ID:**

```js
const token = localStorage.getItem('adminToken');
const payload = JSON.parse(atob(token.split('.')[1]));
setCurrentId(payload.id);
```

Decodes the JWT's payload section (the middle segment between dots) from base64. Extracts the `id` claim. This ID is compared against each admin in the list to mark the current user with a "You" badge and hide the action buttons for that row.

**Add Admin Form:**

Inline 4-column form row. Password field has a show/hide eye icon button. Client-side validation: password minimum 8 characters. On success, appends the new admin to the local `admins` state array directly — no re-fetch needed.

**Admin List:**

Each admin row shows:
- Avatar circle — first character of name or email, uppercase. Gold tint when active, grey when inactive.
- Name (bold) with optional "You" badge (using `.badge-sent` class).
- Email in muted text.
- Active/Inactive status badge.
- Activate/Deactivate toggle button (green icon when active, grey when inactive) — only visible for other admins.
- Delete button (red) — only visible for other admins.

Both the toggle and delete actions use SweetAlert2 dark confirmation dialogs before making API calls. The toggle button shows the opposite action from the current state (if active, shows "Deactivate"). On success, updates the local state with `setAdmins(p => p.map(a => a.id === data.id ? data : a))` — replaces just the modified admin in the array.

---

## Authentication Flow (End to End)

```
1. User visits any URL
       ↓
2. _app.jsx useEffect fires
       ↓
3. Checks localStorage for adminToken
       ├── No token + protected page → redirect to /login
       └── Token exists + /login → redirect to /dashboard
       ↓
4. login.jsx: POST /api/auth/login
       ↓
5. Backend returns JWT
       ↓
6. localStorage.setItem('adminToken', jwt)
       ↓
7. router.replace('/dashboard')
       ↓
8. Every api.js request: Authorization: Bearer <token>
       ↓
9. If any response is 401 (token expired):
   localStorage.removeItem('adminToken')
   window.location.href = '/login'
```

---

## Page Summary

| Page | Route | Auth | API Calls |
|---|---|---|---|
| Login | `/login` | Public | `POST /auth/login` |
| Dashboard | `/dashboard` | Protected | `GET /templates`, `GET /logs`, `GET /users` |
| Users | `/users` | Protected | `GET /users`, `POST /email/send-direct` |
| Templates | `/templates` | Protected | `GET /templates`, `POST /templates`, `PUT /templates/:id`, `DELETE /templates/:id` |
| Campaign | `/campaign` | Protected | `GET /templates`, `GET /users`, `POST /email/send` |
| Logs | `/logs` | Protected | `GET /logs` |
| Settings | `/settings` | Protected | `GET /admins`, `POST /admins`, `PATCH /admins/:id/toggle`, `DELETE /admins/:id`, `POST /auth/reset-request`, `POST /auth/reset-password` |

## Component Inventory

| Component | File | Purpose |
|---|---|---|
| `Layout` | `components/Layout.jsx` | Sidebar + topbar shell for all authenticated pages |
| `SendEmailModal` | `pages/users.jsx` | Compose and send a direct email to one user |
| `TemplateModal` | `pages/templates.jsx` | Create or edit a template with Quill/HTML editor |
| `PreviewModal` | `pages/templates.jsx` | Render template HTML as a simulated email |
| `ChangePassword` | `pages/settings.jsx` | OTP-based password reset flow |
| `AdminManagement` | `pages/settings.jsx` | Admin CRUD: list, add, toggle, delete |
