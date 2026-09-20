# CRM security, workflow, and data audit — 20 September 2026

## Corrected in this release

- The active module is stored in the URL (`?page=...`) and restored on refresh, direct links, and browser history navigation. Restricted module links are checked before rendering.
- Lead conversion, opportunity stage changes, quote approval/status changes, and order status changes now validate configured workflow transitions and required fields in the application. Opportunity closure uses the actual workflow action; duplicate lead conversion and duplicate order creation from a won opportunity are rejected in the application.
- Default quote workflow stages and required fields now match the quote model. Legacy quote stage labels are mapped when read. One orphaned opportunity reference in the sample orders was removed.
- Client writes update changed top-level Firestore fields rather than replacing whole documents. This reduces accidental loss of another user's unrelated edits.
- CRM session authorization no longer attaches an unverified email/password account to a staff record by email alone. New activation codes use 128-bit random values and failed attempts are rate limited. Previously issued short activation codes must be regenerated.
- Firestore rules now protect self-managed role and account-status fields, restrict product and vendor edits, and narrow renewal and marketing edits.
- CSV exports escape spreadsheet formulas. XLSX import and export use maintained libraries with file and sheet size limits. Package audits report zero known advisories in the web and Functions projects at this date.

## Checks performed

- TypeScript lint and production build for the web app and Cloud Functions.
- Sample-data reference, financial arithmetic, and workflow-edge audit (`npm run audit:data`). This checks repository seed data, not every live Firestore document.
- Firestore rules compilation and deployment; live navigation refresh check on `crmnew.amrutsoftware.in`.

## Open security and consistency risks

1. **High — CRM record authorization:** Firestore rules still allow any active staff account to read and write most core collections (accounts, contacts, leads, opportunities, quotes, orders, tasks, and synced mail). The interface hides actions by role, but a direct Firestore client can bypass those controls. Company and record ownership fields, scoped queries, and corresponding Firestore rules or a server API are needed before this is suitable for sensitive multi-company data.
2. **High — Server-enforced workflow:** Stage, approval, pricing, and duplicate-order guards currently run in the React application. Direct Firestore writes or simultaneous users can bypass or race them. Move these operations to transactional server functions, validate old and new states there, and write an immutable audit entry in the same transaction.
3. **High — Synced mail privacy:** The synced mail model and collection access do not isolate messages by mailbox owner. Restrict mail storage and queries to the authorized user or delegated mailbox members.
4. **Live-data audit incomplete:** The consistency script checks bundled sample data. Historical live Firestore records were not exported and reconciled across every module. A read-only production audit should enumerate orphaned references, financial totals, duplicate orders, invalid stages, and company/owner mismatches before any data migration.
5. **Concurrent nested edits:** Top-level field diffs do not merge independent changes inside one nested object. Transactional writes or version checks are still needed for financial and approval records.
6. **Web lead embed:** The form builder's internal submit path was repaired, but the externally displayed embed configuration needs an end-to-end public endpoint and spam protection check before publishing it.

Do not interpret the UI role checks or a clean dependency audit as a complete penetration test. The first three open items require architectural changes and a staged migration of existing data and queries.
