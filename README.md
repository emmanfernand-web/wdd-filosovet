# Filosovet — Petshop & Veterinary Clinic

Filosovet is an Indonesian-language website for a pet shop and veterinary clinic. It combines service information, appointment booking, a product storefront, customer profiles, and an administrative workspace for bookings, inventory, sales, and reporting.

The current implementation is a **static frontend demonstration** built with HTML, CSS, and vanilla JavaScript. Customer and administrative data are stored in the browser's `localStorage`. Authentication, payment status, and distributor orders are simulated; there is no application server or database.

## Contents

- [Key features](#key-features)
- [Technology stack and dependencies](#technology-stack-and-dependencies)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation and local development](#installation-and-local-development)
- [Environment variables and configuration](#environment-variables-and-configuration)
- [Available scripts and commands](#available-scripts-and-commands)
- [Pages, routes, and functionality](#pages-routes-and-functionality)
- [Seven-role admin workspace specification](#seven-role-admin-workspace-specification)
- [Architecture and major components](#architecture-and-major-components)
- [Browser storage and demo data](#browser-storage-and-demo-data)
- [Integrations, backend, and database](#integrations-backend-and-database)
- [Build and deployment](#build-and-deployment)
- [Testing and verification](#testing-and-verification)
- [Troubleshooting](#troubleshooting)
- [Screenshots](#screenshots)
- [Known limitations and possible improvements](#known-limitations-and-possible-improvements)
- [Seven-role implementation checklist](#seven-role-implementation-checklist)
- [Information still needed](#information-still-needed)

## Key features

### Public website and customer experience

- **Clinic information:** homepage sections for services, the booking process, facilities, doctors, testimonials, location, FAQs, and contact links. The open/closed indicator uses the visitor's current local hour.
- **Service catalog:** tabbed information and prices for veterinary consultations, grooming, pet boarding, and shop categories, with links that preselect booking options.
- **Appointment booking:** service subtype, staff selection, monthly calendar, time slots, owner and pet details, validation, estimated cost, and a confirmation code. Pet hotel bookings support a stay of 1–60 days. Available dates and slots include simulated availability.
- **Demo accounts:** login and registration forms, inline validation, password visibility controls, profile editing, and logout. Booking, cart, and profile pages redirect to login when the local user record is absent.
- **Product storefront:** 14 default products, text search, category filters, sorting by sales count/name/price, stock indicators, quantity controls, and cart animations. Prescription products link to consultation booking instead of offering a cart action.
- **Cart and simulated checkout:** quantity changes, removal, the `FILO10` promotion for a 10% subtotal discount, delivery at Rp 15,000 or free store pickup, payment-method selection, and a locally saved receipt. Checkout reduces local stock and increases the product sales count.
- **Customer profile:** personal details, saved pets, booking history, cancellation and rescheduling of upcoming bookings, sample medical records, purchase history, receipt details, and receipt printing.
- **Shared interface:** responsive navigation, persistent light/dark themes, keyboard navigation for tabs, form feedback, modal focus handling, and reduced-motion handling in selected styles and interactions.

### Administrative workspace

- **Dashboard:** today's bookings, paid revenue, hotel occupancy, stock warnings, recent activity, and a seven-day revenue chart.
- **Booking management:** searchable and filtered lists, daily staff timelines, conflict indicators, manual bookings, internal notes, and status history. Completing a booking creates a linked local transaction when one does not already exist.
- **Inventory and pharmacy:** minimum-stock warnings, batch and expiry information, stock adjustments, bulk restock orders, and receiving orders to update stock.
- **Product management:** create, edit, duplicate, archive/reactivate, and update prices or stock inline. Images can be selected from bundled assets or uploaded and resized in the browser.
- **Transactions:** combined customer checkout and cashier transactions, payment/source/date filters, marking pending transactions as paid, and receipt printing.
- **Reports:** period comparisons, revenue, completed bookings, no-show rate, occupancy, top products/services, and payment-method breakdowns. Downloads use CSV; PDF output uses the browser's print dialog.
- **Workspace tools:** global search, booking/stock notifications, collapsible navigation, theme switching, demo role switching, and demo data reset. **A seven-role expansion is specified below but is not confirmed in the uploaded implementation.**

## Technology stack and dependencies

| Technology | Usage |
| --- | --- |
| HTML5 | Static pages, forms, semantic sections, and shared HTML fragments |
| CSS3 | Design tokens, Grid/Flexbox layouts, responsive rules, themes, animations, and print styles |
| Vanilla JavaScript | DOM rendering, event handling, validation, customer workflows, and admin views |
| Browser APIs | `fetch`, `localStorage`, `IntersectionObserver`, `matchMedia`, Web Animations, `FileReader`, Canvas, Blob downloads, and printing |
| Inline SVG | Navigation, status, action, and interface icons |
| Google Fonts | Fraunces, imported by `css/style.css`; local serif fallbacks are defined |
| Local raster assets | Branding, service/product imagery, a background image, and theme image files |
| VS Code Live Server, optional | Local serving; the repository configures port `5501` |
| Python 3, optional | Alternative local static HTTP server |
| Node.js, optional | JavaScript syntax checks; not required to run the website |

There is no `package.json`, dependency lockfile, frontend framework, bundler, or installed JavaScript library declared in the project. No package installation is required.

## Project structure

```text
Filosovet/
├── README.md
├── index.html                    # Homepage
├── .vscode/
│   └── settings.json             # Live Server port: 5501
├── assets/
│   ├── background/               # Bundled hero background image
│   ├── dark_mode/                # Bundled light/dark PNG files
│   └── images/                   # Logo, product photos, and service imagery
├── components/
│   ├── header.html               # Public navigation, cart badge, login link
│   └── footer.html               # Shared service/contact links and copyright year
├── css/
│   ├── tokens.css                # Shared colors, fonts, spacing, and theme tokens
│   ├── style.css                 # Foundation, utilities, and Google Fonts import
│   ├── dark.css                  # Public interface dark-theme overrides
│   ├── index.css                 # Homepage
│   ├── auth.css                  # Login and registration
│   ├── booking.css               # Booking flow
│   ├── daftar-layanan.css        # Service catalog
│   ├── shop.css                  # Storefront and shared shop styling
│   ├── keranjang.css             # Cart, checkout, and receipt modal
│   ├── profil-pelanggan.css       # Profile panels and printable receipt
│   ├── admin.css                 # Admin shell, views, themes, and print styling
│   └── components/
│       ├── header.css
│       └── footer.css
├── js/
│   ├── main.js                   # Shared loader, navigation, helpers, site config
│   ├── dark-mode.js              # Public theme initialization and toggle
│   ├── home.js                   # Homepage tabs, opening status, contact links
│   ├── services-data.js          # Shared booking service definitions
│   ├── booking.js                # Customer calendar and reservations
│   ├── auth.js                   # Simulated login and registration
│   ├── cart.js                   # Product catalog, stock, cart, and checkout
│   ├── toko.js                   # Storefront filters, cards, and quantity controls
│   ├── profil.js                 # Profile, pets, histories, and receipt details
│   ├── section-scroll.js         # Section-scrolling utility; not loaded by index.html
│   └── admin/
│       ├── core.js               # Data model, seed data, roles, and activity log
│       ├── ui.js                 # Tables, layers, icons, charts, downloads, printing
│       ├── dashboard.js          # View registry and dashboard
│       ├── booking.js            # Booking list, timeline, details, manual wizard
│       ├── inventory.js          # Stock, restocking, and product management
│       ├── finance.js            # Transactions, cashier flow, reports, exports
│       └── shell.js              # Hash routing, navigation, search, and account menu
└── pages/
    ├── auth.html
    ├── booking.html
    ├── daftar-layanan.html
    ├── dashboard-admin.html
    ├── keranjang.html
    ├── profil-pelanggan.html
    └── toko.html
```

Operating-system metadata files are omitted from this tree. No existing README, deployment manifest, CI workflow, or test directory was present when this documentation was created.

## Prerequisites

- A current browser with JavaScript, `localStorage`, and the browser APIs listed above enabled. An exact supported browser/version matrix is **Not documented**.
- A local HTTP server. Use Python 3 or VS Code with the Live Server extension.
- Internet access for the externally hosted font and for opening WhatsApp or Google Maps links. The application scripts and product/service images are local.

No database server, Node.js runtime, npm installation, API account, or environment file is required for normal use. Minimum CPU, memory, and operating-system versions are **Not documented**.

## Installation and local development

Obtain a copy of the repository and open its root directory, which contains `index.html`. No dependency installation or compilation is needed.

### Option A: Python static server

Run this command from the project root:

```sh
python3 -m http.server 5501 --bind 127.0.0.1
```

Open [http://127.0.0.1:5501/index.html](http://127.0.0.1:5501/index.html). Stop the server with `Ctrl+C`.

### Option B: VS Code Live Server

1. Open the project root in VS Code.
2. Install the Live Server extension if it is not already available.
3. Right-click `index.html` and select **Open with Live Server**.
4. Use the address shown by the extension. `.vscode/settings.json` configures port `5501`.

Serve the entire project root so `pages/`, `components/`, `css/`, `js/`, and `assets/` are reachable. Opening HTML directly with `file://` can prevent the shared header/footer fetches from working.

### Exploring the demo

Open `pages/auth.html` to use the simulated login or registration forms. Login validates email format and requires a nonempty password, but does not verify an account or password against a server. Registration saves the entered name/email and phone locally; passwords are not persisted by these handlers.

The currently documented admin workspace is available directly at `pages/dashboard-admin.html` and through the admin link on the authentication page. It does not require a separate admin login. Its account menu provides **Simulasi peran** (role simulation) and **Reset data demo** (reset demo data).

Use one browser profile and the same scheme, hostname, and port throughout a demo so all pages read the same storage.

## Environment variables and configuration

**Environment variables: none defined or read by the current application.** There is no `.env` file or environment-variable loader to configure.

Configuration is embedded in source files:

| Location | Names | Purpose |
| --- | --- | --- |
| `js/main.js` | `FV_CONFIG.whatsapp`, `whatsappText`, `emergencyPhone`, `clinicHours.open`, `clinicHours.close` | Shared quick-contact links and homepage opening-status calculation |
| `js/services-data.js` | `SERVICES` | Booking service keys, subtypes, prices, durations, staff, time slots, and per-day billing |
| `js/cart.js` | `DEFAULT_PRODUCTS`, `CAT_LABEL`, `PROMOS`, `SHIPPING_FEE` | Initial products/categories, promotion rules, and delivery fee |
| `js/admin/core.js` | `HOTEL_CAPACITY`, `DISTRIBUTORS`, `PAY_METHODS`, `ROLES` | Occupancy calculations, demo restock choices, payment labels, and simulated view access |
| `css/tokens.css` | CSS custom properties | Shared palette, typography, spacing, controls, and light/dark themes |
| `.vscode/settings.json` | `liveServer.settings.port` | Local Live Server port |

The footer, location content, and admin receipt template also contain static business/contact information. Updating `FV_CONFIG` alone does not update all of that copy. These are public frontend settings; the current application has no mechanism for protecting secret configuration.

## Available scripts and commands

No npm scripts, Makefile targets, or project-specific command-line tasks are defined.

| Command or action | Purpose |
| --- | --- |
| `python3 -m http.server 5501 --bind 127.0.0.1` | Serve the existing files locally; run from the project root |
| VS Code: **Open with Live Server** | Serve the site with the editor extension |
| `node --check js/main.js` | Optional syntax check for one JavaScript file |
| `git diff --check` | Check tracked changes for whitespace problems when working in Git |

There are no configured `install`, `dev`, `build`, `test`, or `deploy` package scripts. Browser printing and CSV downloads are interface actions rather than shell commands.

## Pages, routes, and functionality

### Customer-facing pages

Routes are physical HTML files, relative to the site's serving directory.

| Path | Page | Main functionality |
| --- | --- | --- |
| `/` or `/index.html` | Home | Service discovery, clinic information, tabs, FAQs, contact and booking links |
| `/pages/daftar-layanan.html` | Services | Medical, grooming, hotel, and store information with prices and booking links |
| `/pages/auth.html` | Login / registration | Local demo identity, form validation, and logout |
| `/pages/booking.html` | Booking | Calendar, service/staff/time selection, owner/pet form, confirmation, rescheduling |
| `/pages/toko.html` | Shop | Product search, filters, sorting, stock status, and cart controls |
| `/pages/keranjang.html` | Cart / checkout | Cart editing, promotion, collection/delivery, simulated payment, receipt |
| `/pages/profil-pelanggan.html` | Customer profile | Personal details, pets, booking/medical/purchase histories, and receipts |
| `/pages/dashboard-admin.html` | Admin | Administrative shell and hash-routed views |

Booking, cart, and profile pages use a client-side check for the `fv_user` storage key. Shop browsing is public, but adding/increasing cart items prompts for login if that key is absent.

### Query parameters and profile panels

| Page | Parameter or fragment | Behavior |
| --- | --- | --- |
| `daftar-layanan.html` | `?tab=medis`, `grooming`, `hotel`, or `toko` | Select a service-information tab |
| `auth.html` | `?tab=daftar` | Open registration |
| `booking.html` | `?layanan=grooming`, `konsultasi`, or `hotel` | Preselect a booking service |
| `booking.html` | `tipe=<service-type-key>` | Preselect a subtype defined in `SERVICES` |
| `booking.html` | `hewan=<saved-pet-id>` | Fill details from a locally saved pet |
| `booking.html` | `jadwalUlang=<booking-code>` | Load a locally stored customer booking for rescheduling |
| `toko.html` | `?cat=makanan`, `obat`, `skincare`, `aksesoris`, or `almed` | Preselect a category if active products exist in it |
| `profil-pelanggan.html` | `#panelProfil`, `#panelHewan`, `#panelBooking`, `#panelMedis`, `#panelTransaksi` | Select a profile panel on initial load; sidebar clicks also change the panel |
| `profil-pelanggan.html` | `?nota=<invoice-number>#panelTransaksi` | Open a locally saved purchase receipt |

For example, `/pages/booking.html?layanan=konsultasi&tipe=vaksinasi` opens vaccination booking. Pet IDs, booking codes, and invoice numbers must exist in the current browser storage for their corresponding links to work.

### Admin views

Append a fragment to `/pages/dashboard-admin.html`:

| Fragment | View |
| --- | --- |
| `#/dashboard` | Summary metrics, recent bookings, revenue chart, stock alerts, and activity |
| `#/booking` | Booking list, daily schedule, details, and manual booking wizard |
| `#/stok` | Stock/pharmacy alerts, adjustments, expiry information, and restock orders |
| `#/produk` | Product catalog management |
| `#/transaksi` | Customer/cashier transactions, receipt printing, and transaction exports |
| `#/laporan` | Operational and financial summaries and report exports |

Unknown or unavailable views fall back to the dashboard. **The four roles below are the roles documented in the original implementation; the seven-role configuration in the next section is the agreed product specification, not a verified feature of this uploaded codebase.**

| Currently documented role | Existing available views |
| --- | --- |
| Admin | All six views |
| Dokter | Dashboard, Booking, Stok & Farmasi, Produk; booking initially filters to consultations |
| Kasir | Dashboard, Booking, Stok & Farmasi, Transaksi |
| Groomer | Compact Dashboard and Booking; booking initially filters to grooming |

Role switching and menu filtering currently demonstrate interface behavior only; they do not provide server-enforced authorization.

## Seven-role admin workspace specification

> **Status: planned/approved requirements, not verified as implemented.** The uploaded README documents a four-role working demo. The seven staff roles below define the target behavior for the next admin-workspace update. Do not treat this section as evidence that these routes, forms, or persistent records already exist.

The future staff workspace supports **seven roles**: **Admin, Kasir, Inventory Staff, Resepsionis, Dokter, Groomer, and Pet Hotel Staff**. Customers remain a separate account type in the proposed unified account model, not an eighth staff role.

### Role responsibilities, dashboards, and navigation

| Staff role | Dashboard focus / KPIs | Target navigation | Core actions and scope |
| --- | --- | --- | --- |
| **Admin** | Bookings, revenue, hotel occupancy, stock alerts, pending payments, performance | Dashboard; Booking; Pelanggan & Hewan; Stok & Farmasi; Produk; Transaksi; Laporan; Staff & Role; Pengaturan | Supervise bookings, staff, inventory, sales, approvals, and reports; clinical amendments remain clinician-controlled |
| **Kasir** | Today's transactions, collected revenue, pending invoices, payment methods | Dashboard Kasir; Pembayaran; Kasir / POS; Riwayat Transaksi | POS checkout, service/product invoicing, payment recording, receipt printing; no diagnoses or arbitrary stock edits |
| **Inventory Staff** | Low/out-of-stock items, expiring medicines, stock movements, inbound orders | Dashboard Inventory; Stok & Farmasi; Produk; Restock & Supplier; Riwayat Stok | Receive and adjust inventory with movement history; manage batches, expiry, stock opname, suppliers, and product catalog; cannot issue prescriptions |
| **Resepsionis** | Today's bookings, waiting queue, arrivals, checked-in and completed appointments | Dashboard Front Desk; Booking & Kalender; Antrean / Check-in; Pelanggan & Hewan | Register customers/pets; confirm, reschedule and cancel bookings; check in patients, assign staff, record owner-reported complaints |
| **Dokter** | Assigned consultations, waiting/in-progress/completed patients, follow-ups | Dashboard Dokter; Pasien Hari Ini; Rekam Medis; Resep Obat; Jadwal Konsultasi | Read relevant patient history; create examination drafts, findings, diagnoses, treatment notes and multi-item prescriptions; finalize clinical records and issue addenda |
| **Groomer** | Assigned grooming sessions, waiting/in-progress/completed animals | Dashboard Groomer; Jadwal Grooming; Proses Grooming; Riwayat Grooming | View instructions; start/complete grooming, add service notes and observations; no clinical diagnosis or prescriptions |
| **Pet Hotel Staff** | Current boarders, room occupancy, check-ins/outs, daily care tasks | Dashboard Pet Hotel; Reservasi Hotel; Kandang & Okupansi; Perawatan Harian; Riwayat Penitipan | Assign available rooms, check pets in/out, log feeding, cleaning, observations and medication administration according to veterinary instructions |

The sidebar should be role-aware, but the implementation should reuse shared feature modules rather than creating seven copies of the same booking or customer records. Dashboard KPI figures must be calculated from shared operational data rather than hardcoded values.

### Proposed permissions and workflow boundaries

- **Admin:** broad operational and financial oversight; may not silently change finalized medical findings, diagnosis, or prescriptions.
- **Kasir:** handles invoices, payments and receipts; refunds/voids require an approval trail. Cannot independently modify clinical records, base prices, or stock quantities.
- **Inventory Staff:** handles products, medicine batches and quantity movements, including receiving, stock opname, damaged/expired write-offs. Does not prescribe medication.
- **Resepsionis:** handles appointments, check-in, initial customer-supplied complaints and queues; does not diagnose or edit prescriptions.
- **Dokter:** manages assigned consultations and clinical records; draft and final states must be distinguished. Finalized records require traceable addenda instead of silent overwriting.
- **Groomer:** updates assigned grooming workflow and non-diagnostic observations.
- **Pet Hotel Staff:** updates boarding and care logs; recorded medication administration must follow documented veterinary instructions.

Permission checks should be centralized and applied to action handlers as well as visible navigation. In the static demo, these checks are **not a security boundary** because users can modify localStorage and JavaScript from their browser. Production access requires authenticated sessions and server-side role/record authorization.

### Target cross-role workflows

1. **Consultation:** Customer booking → Resepsionis confirms/checks in → Dokter examines, records findings and prescription → Kasir bills and records payment → inventory is reduced **when medication is dispensed/used**, with movement history → Admin sees operational totals.
2. **Grooming:** Customer booking → Front desk check-in → Groomer performs service and records progress → Kasir handles payment → service history reflects completion.
3. **Pet Hotel:** Reservation → availability and cage assignment → check-in → daily feeding/care logs → check-out → final billing. Overlapping occupancy of the same cage must be prevented.
4. **Stock and shop:** Supplier order received → inventory batch/stock movement added → product availability updated → POS/customer purchase → sale recorded and stock decremented exactly once.

Keep **booking state**, **service-progress state**, **payment state**, **prescription state**, and **hotel stay/occupancy state** separate. In particular, a consultation can be completed while its invoice remains unpaid.

### Agreed future relational data rules

These decisions guide a future backend/ERD; they **do not describe an existing SQL database**:

1. **One unified `users` table** for customer and staff sign-in, with staff/customer profiles and role information. The current agreed initial design uses one role per user.
2. **One booking corresponds to exactly one service.** A multi-service `booking_items` association is not required under the present scope.
3. **Medicines and petshop goods share a `products` catalog.** Prescription-only products require suitable restrictions.
4. **Inventory uses `stock_movements` and `inventory_batches`.** Sales, dispensing, receiving, write-offs and adjustments have traceable movement records; issuing a prescription alone does not reduce stock.
5. **Service charges and product sales share an invoicing model** (`sales`, `sale_items`, `payments`), where one invoice may contain consultation, medicines, and retail products.

Potential domain groups include `users`, `roles`, `staff`, `customers`, `pets`; `services`, `bookings`, scheduling/history; `medical_records`, `prescriptions`, `prescription_items`; `products`, batches, movements, suppliers and purchase orders; `sales`, `sale_items`, `payments`; `grooming_records`; and hotel rooms/stays/care logs. Exact columns, foreign keys, constraints and migrations remain to be designed and validated before implementation.

### Suggested implementation approach

Extend the existing `js/admin/` architecture in stages: (1) centralized roles and permissions, (2) seven role-specific dashboard views and navigation, (3) receptionist and clinical workflows, (4) grooming/hotel operations, (5) invoice/inventory integration, and (6) regression tests and documentation. Preserve existing public pages and storage keys where possible; do not discard existing demo records during migration.

## Architecture and major components

The public site uses separate HTML documents with shared CSS and classic scripts. The admin area uses one HTML shell and an in-browser view registry. There is no module bundling or frontend compilation.

| Component | Responsibility |
| --- | --- |
| `components/header.html`, `components/footer.html` | Public fragments fetched by `main.js`; relative asset/page URLs are prefixed when loaded from `/pages/` |
| `js/main.js` | Loads fragments, initializes navigation and account menus, updates cart badges, inserts quick-contact links, formats currency, displays toasts, and triggers reveal animations |
| `js/dark-mode.js` and theme CSS | Apply the saved/system preference and add the public toggle after components load; the admin shell implements its own toggle using the same storage key |
| `js/services-data.js` | Shared booking definitions used by the customer booking flow and admin data/UI modules |
| `js/cart.js` | Loads the default or saved product catalog, provides cart operations, calculates totals, records checkout orders, and updates stock |
| `js/booking.js`, `js/auth.js`, `js/profil.js`, `js/toko.js`, `js/home.js` | Page-specific rendering, validation, and interactions |
| `js/admin/core.js` | Defines the `AD` data layer, seeds demo records, combines public/admin records, derives status/notifications, and persists updates |
| `js/admin/ui.js` | Defines `UI` helpers for tables, pagination, dialogs, drawers, menus, charts, form errors, printing, and CSV downloads |
| Admin view scripts and `shell.js` | Register views in `Pages`, render the selected hash route, and handle search/navigation/account actions |

Script order matters because scripts share global functions and objects. `main.js` must be available before handlers use its helpers; admin `core.js` requires the product and service definitions, and `dashboard.js` creates `Pages` before the remaining views register themselves. The existing HTML files specify the load order.

Customer bookings are written to `fv_bookings`. Admin reads them alongside `fv_admin_bookings` and writes status/note changes back to the originating store. Customer checkout writes `fv_orders`; admin combines those orders with `fv_admin_trx`. Customer checkout, cashier sales, product editing, and restocking share the product catalog persisted in `fv_products`.

## Browser storage and demo data

All persistent state lives in `localStorage` for the current origin. It survives normal page reloads but is not shared between devices, browser profiles, or different origins. Switching between `localhost` and `127.0.0.1`, changing ports, or deploying to another domain creates a separate storage context.

| Storage key | Contents / purpose |
| --- | --- |
| `fv_user` | Demo user's name and email; also used by client-side login checks |
| `fv_profile` | Profile phone, date of birth, and address |
| `fv_pets` | Saved pets; two example pets are used when no saved list exists |
| `fv_cart` | Product IDs and selected quantities |
| `fv_products` | Persisted product catalog, stock, sales counts, and product settings |
| `fv_bookings` | Customer reservations and status/history information |
| `fv_orders` | Customer checkout history and receipt details |
| `fv_theme` | Light/dark preference shared by public and admin interfaces |
| `fv_admin_seed` | Initialization/date metadata for admin demo data |
| `fv_admin_bookings` | Generated demo and manually entered admin bookings |
| `fv_admin_trx` | Demo, cashier, and completed-service transactions |
| `fv_admin_orders` | Simulated distributor restock orders |
| `fv_admin_log` | Most recent administrative activity entries, capped at 200 |
| `fv_admin_notif_read` | Notification read-state identifiers |
| `fv_admin_role` | Selected simulated staff role |
| `fv_admin_collapsed` | Sidebar collapsed preference |

The admin initializes sample data on first load. On later days it shifts records marked as seed data forward to keep the demonstration relevant to the current date. The customer profile separately includes fixed sample bookings and medical entries in `js/profil.js`; these are not a live medical-record system.

Use the admin account menu's **Reset data demo** action to restore demo operational data. After confirmation, it removes admin seed/bookings/transactions/restock orders/activity/read-state, saved products, customer bookings, and customer orders, then reloads to reseed. It retains the local user, profile, pets, cart, theme, role, and sidebar preference. Use browser developer tools to inspect storage or remove a specific key when diagnosing other state issues.

Signing out removes `fv_user`; it does not clear the other stored data. Customer histories are stored per browser origin rather than isolated per authenticated account.

## Integrations, backend, and database

| Integration | Implementation |
| --- | --- |
| Shared HTML loading | Same-origin `fetch` requests for `components/header.html` and `components/footer.html` |
| WhatsApp | `wa.me` links from site settings and customer contact details; no messaging API or automatic delivery |
| Phone / email | `tel:` and `mailto:` links that open the visitor's configured applications |
| Google Maps | External directions/search link; no embedded Maps SDK or API key |
| Google Fonts | External stylesheet/font loading for Fraunces with local fallback fonts |
| Printing and exports | Browser printing for receipts/reports, Save as PDF where supported, and Blob-based CSV downloads |

There is no business API, backend service, payment gateway, remote authentication provider, database connection, schema, migration, or database setup command. Distributor orders only create and update local records. CSV exports are actual `.csv` files; the interface's Excel wording does not indicate native `.xlsx` generation.

## Build and deployment

**Build step: none.** The files in the repository are the files served to the browser. There is no generated `dist/` or `build/` directory.

Deployment provider, production URL, automated deployment commands, CI/CD, and hosting-specific configuration are **Not documented**. For a static deployment of the current demo:

1. Choose a host that serves static HTML, CSS, JavaScript, and image files over HTTP(S).
2. Publish `index.html`, `pages/`, `components/`, `css/`, `js/`, and `assets/`, preserving their relative paths. Repository metadata, `.vscode/`, and operating-system metadata are not needed by the website.
3. Use the project root as the serving/publish directory and `index.html` as the index document. If a provider requires a build command, configure it to skip building according to that provider's settings.
4. Confirm direct access to every `/pages/*.html` file and both shared fragments. Admin fragments route within `dashboard-admin.html`; no SPA rewrite rule is required for them.
5. Verify themes, images, contact links, and browser storage on the deployed origin. Existing local development data does not move to that origin.

The supported deployment here is a static demonstration. Real customer accounts, payments, synchronized inventory, and private staff access require additional backend implementation.

## Testing and verification

No automated test suite, test runner, linter configuration, or CI checks are included. Browser compatibility results and end-to-end test coverage are **Not documented**.

During preparation of this README, all 17 JavaScript files passed `node --check`. A static check of local `href`/`src` references across the 10 page/component HTML files found three missing doctor portraits, listed below. These checks do not establish browser interaction correctness; a full browser acceptance run was not performed.

To repeat syntax checks with Node.js from the project root in a POSIX-compatible shell:

```sh
for script in js/*.js js/admin/*.js; do
  node --check "$script" || break
done
```

Suggested manual checks when making changes:

| Area | Verification |
| --- | --- |
| Navigation and layout | Open every page, confirm shared header/footer load, and test mobile menu, keyboard focus, and both themes |
| Accounts | Exercise invalid inputs, register/login, edit profile, and log out; confirm protected pages redirect without a user record |
| Booking | Select each service, date, slot, and saved pet; check totals, submit, view history, reschedule, and cancel an upcoming reservation |
| Shop and cart | Search/filter/sort; check stock limits and prescription links; edit quantities, apply/remove `FILO10`, and compare delivery with pickup |
| Checkout | Complete simulated QRIS/transfer/card and COD selections; verify receipt/history and stock changes; COD is pending while other methods are immediately marked paid |
| Admin booking | Find a public booking using an appropriate date filter; confirm/process/complete it and inspect the resulting transaction; try manual booking and conflict indicators |
| Products and stock | Edit/archive/reactivate a product, adjust stock, create/receive a restock order, then reload the storefront to see changes |
| Reports and roles | Switch simulated roles, inspect available views, export CSV, and preview receipt/report printing or Save as PDF |

## Troubleshooting

| Symptom | Explanation / action |
| --- | --- |
| Header or footer is absent | Use HTTP serving from the project root and check the Network/Console panels for failed component fetches. Avoid `file://`. |
| Page redirects to login | Booking, cart, and profile require the local `fv_user` record. Use the demo login/registration page on the same origin. |
| Cart, products, or history appears different | Check hostname, port, browser profile, and storage settings. Data is local to that origin and may have been cleared. |
| Admin cannot find a customer booking | Check date/service/status filters and simulated role. Booking defaults to today's records; choose an appropriate range or all dates. |
| An admin view is unavailable | Check the account menu's simulated role and its allowed views. Unknown/unauthorized hashes fall back to the dashboard. |
| Changes are missing in an already-open tab | Product/state snapshots are read during page initialization; reload the affected page. There is no general live cross-tab synchronization. |
| Doctor photographs do not appear | Three portrait files referenced by `index.html` are absent. Its image error handlers remove failed images, leaving initials. |
| Font looks different offline | Fraunces is fetched from Google Fonts; the configured local serif fallback is used when it is unavailable. |
| Saving data or uploaded images fails | Check browser storage permissions and quota. Uploaded product images are stored as resized data URLs in the local catalog. |
| PDF button opens a print dialog | This is the implementation. Select the browser/OS PDF destination when available. |
| Local port is occupied | Stop the other server or choose a free port. A different port has separate browser storage. |

## Screenshots

Screenshots are **Not documented**. The existing images are website assets, not captured interface screenshots. Suggested placeholders for future documentation:

| Screenshot | Status |
| --- | --- |
| Homepage — desktop, light theme | Placeholder: add screenshot |
| Booking calendar and summary | Placeholder: add screenshot |
| Shop and cart — mobile | Placeholder: add screenshot |
| Customer profile and histories | Placeholder: add screenshot |
| Admin dashboard — dark theme | Placeholder: add screenshot |
| Admin daily schedule and reports | Placeholder: add screenshot |

## Known limitations and possible improvements

### Verified limitations

- **Local demo identity and access:** the proposed seven-role model is not a verified implementation in this uploaded README; passwords are not verified, there is no remote session, and admin role switching is available in the browser. The login form's remember-me checkbox has no corresponding behavior in `auth.js`; password reset reports that it is unavailable in the demo.
- **Browser-only persistence:** records are not synchronized, backed up remotely, or isolated by account. Signing out leaves operational data in storage.
- **Simulated payment and fulfillment:** checkout records a local receipt without contacting a payment provider. Non-COD methods become paid immediately. Delivery changes the fee/label but does not implement shipping-address confirmation, courier booking, or fulfillment tracking.
- **Simulated public availability:** customer time-slot fullness is calculated by `seededFull()` rather than actual reservations or staff schedules. Admin has local conflict checks and hotel occupancy checks, but customer booking is not connected to that availability model.
- **Sample clinical/history content:** profile medical records and sample bookings are fixed frontend data. The service catalog's HTML copy/prices are maintained separately from the booking definitions in `SERVICES`.
- **Missing portraits:** `assets/images/doctors/andini.jpg`, `prasetyo.jpg`, and `larasati.jpg` are referenced but absent; initials provide a visual fallback.
- **Inactive scrolling utility:** `js/section-scroll.js` exists but is not loaded by `index.html`; its `.fullscreen-section` targets also differ from the current homepage's `.home-section` markup. Its custom section-scrolling behavior is not an active feature.
- **Time handling:** opening status and scheduling depend on the visitor's device clock/timezone; no explicit clinic timezone is configured.
- **Business content verification:** clinic contact details, staff descriptions, testimonials, and marketing figures are static content whose real-world accuracy is **Not documented**.
- **Quality/deployment infrastructure:** automated tests, a browser support matrix, CI/CD, and a production deployment configuration are absent.

### Possible improvements

These are suggestions based on the implementation, not an approved roadmap:

- Introduce a backend with account-scoped persistence, authentication, server-side authorization, and validation.
- Use one authoritative availability model for customer and admin bookings, including staff conflicts and hotel capacity.
- Integrate payment verification, order fulfillment, and real supplier workflows if commercial use is intended.
- Consolidate service/pricing and business/contact content into shared data definitions.
- Supply approved doctor portraits, verify business copy, and add interface screenshots.
- Add meaningful browser workflow tests, accessibility checks, timezone handling, storage-error feedback, and deployment automation.

## Seven-role implementation checklist

The following items are **acceptance criteria for the planned upgrade**. Their presence here does not indicate they have been implemented or tested.

- [ ] All seven roles appear in role simulation; active role updates navigation and dashboard without data loss.
- [ ] The role/permission registry is centralized; direct hash routes and action handlers check access.
- [ ] Each role has meaningful, data-backed KPIs and task-specific views.
- [ ] Receptionist can register owner/pet, manage appointments, and check in patients.
- [ ] Doctor can save draft records, finalize notes, add traceable amendments, and issue multi-item prescriptions.
- [ ] Groomer can record assigned service progress and notes.
- [ ] Pet Hotel Staff can assign a non-overlapping room, check in/out, and maintain daily care logs.
- [ ] Inventory Staff can record batch-aware stock movements and purchase-order receipts.
- [ ] Cashier can generate itemized invoices for both services and products, record simulated payments, and print receipts.
- [ ] Medication dispensing and product checkout reduce stock exactly once; prescribing alone does not.
- [ ] Customer, pet, booking, invoice, and product records remain consistent across views and survive refresh.
- [ ] Light/dark theme, responsive layout, and existing public customer workflows still function.
- [ ] JavaScript checks, manual role-by-role acceptance tests, and relevant regression checks are documented.

## Information still needed

| Item | Status |
| --- | --- |
| Production hosting provider, domain, and deployment process | Not documented |
| Official browser/system support requirements | Not documented |
| Approved business details, staff imagery, and asset attribution | Not documented |
| Screenshot captures | Not documented |
| Chosen license and approved contributor/maintainer attribution | Not documented; no license file or contributor documentation is included |
| Prioritized future roadmap | Not documented |
