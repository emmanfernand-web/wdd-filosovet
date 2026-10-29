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
- **Appointment booking:** service subtype, staff selection, monthly calendar, time slots, owner and pet details, validation, estimated cost, and a confirmation code. Pet hotel bookings support a stay of 1–60 days. Available dates and slots are checked against stored bookings, actual staff conflicts, and the shared eight-room hotel capacity.
- **Demo accounts:** login and registration forms, inline validation, password visibility controls, profile editing, and logout. Booking, cart, and profile pages redirect to login when the local user record is absent.
- **Product storefront:** 14 default products, text search, category filters, sorting by sales count/name/price, stock indicators, quantity controls, and cart animations. Prescription products link to consultation booking instead of offering a cart action.
- **Cart and simulated checkout:** quantity changes, removal, the `FILO10` promotion for a 10% subtotal discount, delivery at Rp 15,000 or free store pickup, payment-method selection, and a locally saved receipt. Checkout reduces local stock and increases the product sales count.
- **Customer profile:** personal details, saved pets, booking history, cancellation and rescheduling of upcoming bookings, finalized clinical records plus labeled sample medical entries, purchase history, receipt details, and receipt printing.
- **Shared interface:** responsive navigation, persistent light/dark themes, keyboard navigation for tabs, form feedback, modal focus handling, and reduced-motion handling in selected styles and interactions.

### Administrative workspace

- **Dashboard:** today's bookings, paid revenue, hotel occupancy, stock warnings, recent activity, and a seven-day revenue chart.
- **Booking management:** searchable and filtered lists, daily staff timelines, conflict indicators, manual bookings, internal notes, and status history. Clinical finalization, grooming completion, and hotel check-out create a linked **unpaid** invoice once; service completion does not collect payment.
- **Inventory and pharmacy:** minimum-stock warnings, batch and expiry information, stock adjustments, bulk restock orders, and receiving orders to update stock.
- **Product management:** create, edit, duplicate, archive/reactivate, and update prices or stock inline. Images can be selected from bundled assets or uploaded and resized in the browser.
- **Transactions:** combined customer checkout and cashier transactions, payment/source/date filters, marking pending transactions as paid, and receipt printing.
- **Reports:** period comparisons, revenue, completed bookings, no-show rate, occupancy, top products/services, and payment-method breakdowns. Downloads use CSV; PDF output uses the browser's print dialog.
- **Workspace tools:** global search, booking/stock notifications, collapsible navigation, theme switching, demo role switching, and demo data reset. The seven-role extension described below is implemented through shared domain services and role-specific views.

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
│   ├── operations-store.js       # Shared persistence, stock ledger and availability
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
│       ├── permissions.js        # Seven roles, actions and staff identity
│       ├── operations.js         # Front desk, registration and grooming services
│       ├── stock-service.js      # Catalog, supplier, stock and batch services
│       ├── clinical.js           # Medical drafts/final records, prescriptions, amendments
│       ├── boarding.js           # Rooms, stays and care logs
│       ├── billing.js            # Invoices, payments, POS and dispensing
│       ├── workspace-ui.js       # Shared operational tables/forms and customer UI
│       ├── clinical-ui.js        # Examination and prescription forms
│       ├── operations-ui.js      # Hotel, inventory, staff and settings UI
│       ├── pos-ui.js             # Cashier invoices and searchable point of sale
│       ├── role-dashboards.js    # Role-specific dashboard compositions
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

Operating-system metadata files are omitted from this tree. No deployment manifest or CI workflow is present. Dependency-free regression checks now live in `tests/`.

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
| `js/admin/core.js` | `HOTEL_CAPACITY`, `DISTRIBUTORS`, `PAY_METHODS` | Capacity, demo supplier defaults and payment labels |
| `js/admin/permissions.js` | `ROLES`, `PERM`, `ACTIONS`, `ACTION_POLICY` | Seven-role navigation and action/assignment policy |
| `css/tokens.css` | CSS custom properties | Shared palette, typography, spacing, controls, and light/dark themes |
| `.vscode/settings.json` | `liveServer.settings.port` | Local Live Server port |

The footer, location content, and admin receipt template also contain static business/contact information. Updating `FV_CONFIG` alone does not update all of that copy. These are public frontend settings; the current application has no mechanism for protecting secret configuration.

## Available scripts and commands

No npm scripts or build tooling are required. Project checks use Node’s built-in test runner and Python’s standard library.

| Command or action | Purpose |
| --- | --- |
| `python3 -m http.server 5501 --bind 127.0.0.1` | Serve the existing files locally; run from the project root |
| VS Code: **Open with Live Server** | Serve the site with the editor extension |
| `node --check js/main.js` | Optional syntax check for one JavaScript file |
| `git diff --check` | Check tracked changes for whitespace problems when working in Git |

There are no configured `install`, `dev`, `build`, `test`, or `deploy` package scripts; use the direct verification commands below. Browser printing and CSV downloads are interface actions rather than shell commands.

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

Open `/pages/dashboard-admin.html#/dashboard`. Use the account menu’s **Simulasi peran** selector for seven roles and **Identitas staff demo** to choose a specific doctor, groomer or boarding attendant. Switching roles returns to the corresponding dashboard, closes stale dialogs, updates navigation/notifications and retains the theme and operational data. Unknown or disallowed hashes return to the role dashboard.

## Seven-role admin workspace specification

**Implemented as a frontend demonstration.** Navigation and action handlers enforce centralized UI permissions; browser storage and role simulation do not provide secure authentication or server-side authorization.

| Role | Dashboard / navigation | Implemented work |
| --- | --- | --- |
| Admin | Dashboard; Booking; Pelanggan & Hewan; Stok & Farmasi; Produk; Transaksi; Laporan; Staff & Role; Pengaturan | Revenue/day/month, bookings, active occupancy, stock/expiry alerts, recent transactions and activity; shared customer/pet editing; staff profiles, catalog/prices, supplier orders, reports and adjustment decisions |
| Kasir | Dashboard Kasir; Pembayaran; Kasir / POS; Riwayat Transaksi | Search catalog, quantity cart, FILO10, catalog prices, simulated payment methods, itemized service invoices, additional retail items, receipts/printing and correction requests |
| Inventory Staff | Dashboard Inventory; Stok & Farmasi; Produk; Restock & Supplier; Riwayat Stok | Low/empty/expiry/inbound KPIs; nonfinancial catalog edits, suppliers, receiving, batches, audited expiry corrections, stock opname/write-offs, movement history and prescription dispensing |
| Resepsionis | Dashboard Front Desk; Booking & Kalender; Antrean / Check-in; Pelanggan & Hewan | Register/edit owners and pets, manual bookings, confirmation, reasoned cancellation, rescheduling, assignment, initial complaints and verified check-in |
| Dokter | Dashboard Dokter; Pasien Hari Ini; Rekam Medis; Resep Obat; Jadwal Konsultasi | Assigned queues, patient/owner details and prior final records; structured drafts, final examinations, procedures, follow-up, multiple medicines and immutable final records with addenda |
| Groomer | Dashboard Groomer; Jadwal Grooming; Proses Grooming; Riwayat Grooming | Assigned schedule, check-in queue, start/progress/completion, performed-service notes, observable conditions, prior grooming records and payable service charges |
| Pet Hotel Staff | Dashboard Pet Hotel; Reservasi Hotel; Kandang & Okupansi; Perawatan Harian; Riwayat Penitipan | Room reservation, overlap prevention, check-in/out, current occupancy, feeding/water/cleaning/activity/incident logs and medication administration referring to a dispensed veterinarian prescription |

Operational fragments use their Indonesian identifiers: `#/booking`, `#/pelanggan`, `#/stok`, `#/produk`, `#/transaksi`, `#/laporan`, `#/staff`, `#/pengaturan`, `#/pembayaran`, `#/pos`, `#/supplier`, `#/mutasi`, `#/antrean`, `#/pasien`, `#/medis`, `#/resep`, `#/jadwal`, `#/grooming`, `#/proses`, `#/riwayatgrooming`, `#/reservasi`, `#/kandang`, `#/perawatan`, `#/riwayathotel`.

### Permissions and clinical access policy

`permissions.js` defines role routes, capability constants, action verbs (`view`, `create`, `edit`, `archive`, `confirm`, `complete`, `approve`, `export`) and reusable authorization/assignment helpers. Doctors, groomers and boarding attendants act on assigned records. Staff IDs retain references when display names change. Active assignments must be transferred before a staff member is disabled or changes role.

The implemented clinical policy is conservative: **Admin does not open diagnoses or clinical prescriptions**. Admin supervises operational completion and financial invoice items. Responsible doctors edit drafts and append corrections to final records; final diagnoses/prescriptions are never overwritten. Inventory sees the medicine quantities and administration instructions needed for dispensing, without diagnoses. Receptionist complaints and groomer observations are not diagnoses.

Cashiers cannot change catalog prices, manually edit stock, delete payment history or prescribe. Inventory edits nonfinancial product information; Admin creates new catalog products and sets base prices. Refund/correction requests require an explicit recorded Admin decision. **Approval only records a demo decision; it does not issue a refund, reverse an invoice, return stock or transfer money.**

### Integrated workflows

1. **Consultation:** Receptionist registers owner/pet → creates or confirms one-service booking and assigns a doctor → verifies identity and checks in → responsible Doctor opens patient, saves structured draft and optional multi-medicine prescription → checks Finalisasi and saves → one unpaid invoice contains consultation, optional billable procedures and medicine items → Cashier may add retail products and records payment → Inventory verifies itemized prescription and records actual dispensing once. Doctor final records and addenda appear in the matching customer’s medical history.
2. **Grooming:** Public/manual booking → receptionist confirmation/check-in → assigned Groomer records Dalam Proses then Selesai with notes → one unpaid invoice → cashier payment → originating booking and customer history reflect completion.
3. **Pet Hotel:** Confirmed reservation → assigned Hotel Staff reserves one of eight rooms for a non-overlapping date interval → check-in → record daily care (default feeding schedule: morning/evening) → check-out frees active occupancy and creates an unpaid invoice → cashier payment. Receptionist rescheduling synchronizes an unstarted stay with conflict checks; cancellation releases its placement. A public reschedule releases the previous placement for staff reassignment. Medication logs require a prescription for the same pet that has already been dispensed.
4. **Stock and shop:** Inventory creates supplier order with quantity/batch/expiry → receives once → catalog stock and batch ledger increase → storefront/POS use the same catalog → checkout deducts once. Merchandise on service invoices is deducted on payment; prescribed medicine is deducted separately on dispensing. Expired batches cannot be sold or dispensed; explicit write-offs can remove them.

Bookings remain one service each. Invoices can contain multiple service/procedure/medicine/retail lines. Booking status, `serviceProgress`, invoice payment status, prescription status and hotel stay status are separate. Creating a prescription reserves no inventory. Repeated payment, order receipt and medicine dispensing are idempotent. POS also uses a request ID to avoid duplicate submissions. Staff availability comes from existing booking intervals; no random fullness simulation remains.

### Data migration and backend direction

Legacy `fv_bookings`, `fv_admin_bookings`, `fv_products`, `fv_orders`, and `fv_admin_trx` remain in use. Normalization adds stable customer, pet and staff references without clearing records. Names/contact details remain useful historical snapshots. Existing paid history remains paid; new completed services produce unpaid invoices. Historical stock changes are **not** invented: an explicit opening-balance movement marks the migration boundary.

`fv_workspace_v1` groups normalized operational collections. These correspond to future relational customers/pets/staff, medical records/amendments/prescriptions, batches/movements, suppliers, payments, grooming, rooms/stays/care and approval entities. Invoice items and prescription items are currently nested arrays, ready to split into related tables later. No MySQL, PHP, Node server or payment provider has been added.

Persistence helpers read fresh state, validate input and attempt rollback on multi-key write failures. Corrupt workspace collections cause an error rather than being replaced with empty data. This is best-effort browser persistence, **not an ACID transaction or a cross-tab lock**. Stock movements are the quantity audit source; batch corrections preserve their own before/after history. Separate activity-log write failures display a warning without misreporting an already committed operation as failed.

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
| `js/operations-store.js` | Shared persistence, identifiers, migration support, stock ledger, public checkout and booking availability |
| `js/admin/core.js` | Legacy booking/transaction adapters, seed data, formatters, activity and notification primitives |
| `js/admin/permissions.js` | Seven roles, page/action policy and staff assignment helpers |
| `js/admin/operations.js`, `stock-service.js` | Registration, check-in, scheduling, grooming, suppliers, catalog and inventory services |
| `js/admin/clinical.js`, `boarding.js`, `billing.js` | Clinical lifecycle, hotel operations, itemized invoices, payment, POS, dispensing and approval services |
| `js/admin/workspace-ui.js`, `clinical-ui.js`, `operations-ui.js`, `pos-ui.js`, `role-dashboards.js` | Operational forms, role views and distinct data-backed dashboard compositions |
| `js/admin/ui.js` | Defines `UI` helpers for tables, pagination, dialogs, drawers, menus, charts, form errors, printing, and CSV downloads |
| Admin view scripts and `shell.js` | Register views in `Pages`, render the selected hash route, and handle search/navigation/account actions |

Script order matters because scripts share global functions and objects. `main.js` must be available before handlers use its helpers; admin `core.js` requires the product and service definitions, and `dashboard.js` creates `Pages` before the remaining views register themselves. `operations-store.js` precedes public/admin consumers; permissions and domain services load after core; extension UI scripts load after the legacy views and before shell. The existing HTML files specify the load order.

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
| `fv_staff_<role>` | Selected simulated staff display name per role |
| `fv_workspace_v1` | `version: 1`; customers, pets, staff, medical, amendments, prescriptions (nested items), grooming (progress history), rooms, stays, care, batches, movements, payments, suppliers, approvals and batchHistory |

The admin initializes sample data on first load, then freezes seeded dates once the normalized workspace exists so dependent records retain their dates. Initial products and their expiry dates are persisted during migration. Seeded staff/bookings/transactions carry demo markers, and the top bar identifies the workspace as a local demo. The customer profile retains its legacy sample bookings and explicitly labels sample clinical entries; finalized operational medical records are loaded separately.

Use the admin account menu's **Reset data demo** action to restore demo operational data. After confirmation, it removes admin seed/bookings/transactions/restock orders/activity/read-state, saved products, customer bookings, customer orders and the normalized workspace (including clinical/boarding/staff data), then reloads to reseed. Reset is restricted to Admin. It retains the local user, profile, pets, cart, theme, role, and sidebar preference. Use browser developer tools to inspect storage or remove a specific key when diagnosing other state issues.

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

Run from the repository root:

```sh
node --test tests/workspace.test.cjs
python3 tests/check-assets.py
for script in js/*.js js/admin/*.js; do
  node --check "$script" || exit 1
done
git diff --check
```

The Node suite exercises scenarios A–D through the real services, shared checkout, stable references/reload, permission denials, unauthorized routing, drafts/final/addenda, multi-medicine dispensing, repeated requests, mixed invoices, corrupted totals, quota failures, batch expiry corrections, room conflicts/cancellation/rescheduling, staff rename/availability and malformed storage. View renderers execute with real table templates against a minimal DOM stub. **These are executable logic/template checks, not actual browser tests.**

The local-reference checker treats injected header/footer links as project-root links. Three pre-existing missing doctor portraits are reported separately: `assets/images/doctors/andini.jpg`, `prasetyo.jpg`, `larasati.jpg`. Newly added scripts/assets must resolve. A mechanical interface scan reported only the two existing inset stock-warning stripes in `css/admin.css`; they were retained to preserve the incumbent stock-table design.

**Browser verification status:** the browser connector returned no available browser during implementation. Actual pointer/keyboard workflows, print previews, console/network state, light/dark screenshots and desktop/mobile visual layout still require the following manual acceptance run. No browser screenshots or browser console pass is claimed.

### Role-by-role manual acceptance

Use one origin/browser profile. Avoid Reset unless intentionally discarding demo operational records.

1. **Admin:** open account menu and check all seven role choices; switch theme; inspect dashboard/report totals, staff profiles and settings. Create a staff profile and verify it becomes assignable. Attempt `#/medis` and confirm fallback. Review an explicit cashier correction request under Pengaturan.
2. **Resepsionis:** register a customer and pet, create tomorrow’s consultation booking with a selected doctor, inspect conflict errors, confirm a public booking and check in after verifying owner/pet. Test rescheduling and cancellation with a reason. Reload to verify persistence.
3. **Dokter:** select the assigned doctor under Identitas staff demo. Open the checked-in patient via Jadwal Konsultasi (Pasien Hari Ini filters today). Save a draft with findings, optional weight/temperature, diagnosis, procedures and follow-up. Add two different catalog medicines with complete administration instructions. Reopen, finalize and verify the record cannot be overwritten. Add an addendum.
4. **Kasir:** find the unpaid invoice under Pembayaran. Check consultation/procedure/medicine lines, add a non-prescription retail item, pay using an explicitly simulated method, reopen/print the receipt and confirm no second payment appears. Test POS search, quantity changes and FILO10. Submit a correction request; it must not silently reverse the transaction.
5. **Inventory Staff:** open Stok & Farmasi, verify the itemized prescription before dispensing and confirm quantities decrease once. Try dispensing again. Create a supplier order with batch/expiry, receive it once, inspect Riwayat Stok and batch details, perform stock opname/write-off, and use Koreksi batch for an audited expiry correction. Catalog base prices must remain locked.
6. **Groomer:** receptionist checks in a grooming booking; select its groomer identity, start grooming, record performed services/observations, complete, and verify the invoice and customer booking history. Other groomers’ assignments must be unavailable.
7. **Pet Hotel Staff:** confirm a hotel booking, assign a room, attempt an overlapping reservation, check in, record feeding/water/cleaning/incident notes, and check out. Confirm occupancy drops and an unpaid invoice appears. Medication care must reject missing/foreign/undispensed prescription references.
8. **Public regression:** login/profile/pets, public booking/rescheduling/cancellation, storefront filters, cart quantities/FILO10/COD and pickup/delivery, receipts, shared stock after reload, medical history for the matching owner, responsive sidebar/tables/forms, tab/Escape focus behavior and both themes.

## Troubleshooting

| Symptom | Explanation / action |
| --- | --- |
| Header or footer is absent | Use HTTP serving from the project root and check the Network/Console panels for failed component fetches. Avoid `file://`. |
| Page redirects to login | Booking, cart, and profile require the local `fv_user` record. Use the demo login/registration page on the same origin. |
| Cart, products, or history appears different | Check hostname, port, browser profile, and storage settings. Data is local to that origin and may have been cleared. |
| Admin cannot find a customer booking | Check date/service/status filters and simulated role. Booking defaults to today's records; choose an appropriate range or all dates. |
| An admin view is unavailable | Check the account menu's simulated role and its allowed views. Unknown/unauthorized hashes fall back to the dashboard. |
| Changes are missing in an already-open tab | Admin listens for storage events and refreshes idle views; reload public pages to refresh their product/history snapshots. Simultaneous editing in multiple tabs is not transactionally safe. |
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

- **Local demo identity and access:** seven-role UI permissions are implemented, but they are not a security boundary; passwords are not verified, there is no remote session, and admin role switching is available in the browser. The login form's remember-me checkbox has no corresponding behavior in `auth.js`; password reset reports that it is unavailable in the demo.
- **Browser-only persistence:** records are not synchronized, backed up remotely, or isolated by account. Signing out leaves operational data in storage.
- **Simulated payment and fulfillment:** checkout records a local receipt without contacting a payment provider. Non-COD methods become paid immediately. Delivery changes the fee/label but does not implement shipping-address confirmation, courier booking, or fulfillment tracking.
- **Availability limits:** public/admin booking checks use actual local records and capacity, but there is no server lock, staff leave calendar or cross-device synchronization.
- **Clinical/history limits:** live final records/addenda are integrated, while labeled legacy sample content remains. Medical attachments, lab systems, prescription version replacement and server-enforced patient privacy are outside this demo. Service catalog HTML copy/prices are maintained separately from `SERVICES`.
- **Missing portraits:** `assets/images/doctors/andini.jpg`, `prasetyo.jpg`, and `larasati.jpg` are referenced but absent; initials provide a visual fallback.
- **Inactive scrolling utility:** `js/section-scroll.js` exists but is not loaded by `index.html`; its `.fullscreen-section` targets also differ from the current homepage's `.home-section` markup. Its custom section-scrolling behavior is not an active feature.
- **Time handling:** opening status and scheduling depend on the visitor's device clock/timezone; no explicit clinic timezone is configured.
- **Business content verification:** clinic contact details, staff descriptions, testimonials, and marketing figures are static content whose real-world accuracy is **Not documented**.
- **Quality/deployment infrastructure:** dependency-free service/template tests are included; an actual browser acceptance run, support matrix, CI/CD and production deployment configuration remain outstanding. Refund approval is a recorded decision only, not an executed reversal. Hotel billing uses the booked duration; overstay pricing and external fulfillment are not implemented.

### Possible improvements

These are suggestions based on the implementation, not an approved roadmap:

- Introduce a backend with account-scoped persistence, authentication, server-side authorization, and validation.
- Move availability, inventory balances and payment idempotency into server transactions with validated foreign keys and a clinic timezone.
- Integrate payment verification, order fulfillment, and real supplier workflows if commercial use is intended.
- Consolidate service/pricing and business/contact content into shared data definitions.
- Supply approved doctor portraits, verify business copy, and add interface screenshots.
- Add meaningful browser workflow tests, accessibility checks, timezone handling, storage-error feedback, and deployment automation.

## Seven-role implementation checklist

- [x] Seven roles, distinct data-backed dashboard compositions, navigation, role switching and action permissions.
- [x] Receptionist shared registration, booking/check-in/assignment with conflict checks and cancellation reasons.
- [x] Doctor structured draft/final records, addenda and multi-medicine prescriptions; relevant customer history.
- [x] Assigned grooming progress and hotel room/care/check-out workflows.
- [x] Inventory batches/movements, supplier orders, receiving, stock opname/write-offs and audited metadata corrections.
- [x] Itemized service/retail billing, POS promotions, separate simulated payments, receipts and approval decisions.
- [x] Shared public checkout stock ledger, duplicate-operation guards, legacy normalization and reload tests.
- [x] Syntax, local-reference, service/integration and template rendering checks.
- [ ] Actual browser acceptance: desktop/mobile, both themes, keyboard/focus, print preview and console/network checks.

## Information still needed

| Item | Status |
| --- | --- |
| Production hosting provider, domain, and deployment process | Not documented |
| Official browser/system support requirements | Not documented |
| Approved business details, staff imagery, and asset attribution | Not documented |
| Screenshot captures | Not documented |
| Chosen license and approved contributor/maintainer attribution | Not documented; no license file or contributor documentation is included |
| Prioritized future roadmap | Not documented |
