# Email hero art

**These files look unreferenced. They are not — do not delete them.**

Nothing in the source tree links to them directly. They are referenced from
template bodies stored in the database, which the send pipeline reads at
runtime.

Each hero ships as a **pair**:

- `*.svg` — what the admin UI and older saved templates point at
- `*.png` — what actually goes out in mail

`_EMAIL_ART_SVG_RE` in `backend/services/email.py` rewrites any
`/assets/images/email/<name>.svg` to `<name>.png` at send time, because no
mainstream mail client renders SVG. **Both halves of every pair must exist**:
delete a `.png` and that hero silently becomes a broken image in the inbox;
delete an `.svg` and older templates stop resolving.

Adding a hero means adding both files. See "Email image rendering" in
`backend/BACKEND.md`.
