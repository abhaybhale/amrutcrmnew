# crmnew Live Data Profile

Profile date: 24 October 2026  
Mode: read-only Firestore REST API inspection  
Project: `gen-lang-client-0722379473`  
Database: `ai-studio-amrutcrmenterpri-21d4b3fe-9d3a-40be-887c-3c3e44436203`

No documents were created, updated, deleted or exported by this profile.

## Inventory

- Collections: **34**
- Documents: **25,513**

| Collection | Documents |
| --- | ---: |
| auditLogs | 10,768 |
| orders | 2,734 |
| renewalRecords | 2,234 |
| accounts | 1,334 |
| leads | 1,109 |
| contacts | 1,060 |
| namedAccounts | 907 |
| opportunities | 664 |
| datasetRecords | 555 |
| notifications | 3,233 |
| tasks | 344 |
| ownershipConflicts | 176 |
| userActivity | 102 |
| fieldAttributes | 78 |
| users | 42 |
| vendors | 36 |
| products | 34 |
| roles | 27 |
| assignmentHistory | 17 |
| vendorTargets | 17 |
| authProfiles | 10 |
| workflows | 6 |
| fieldSecurityRules | 5 |
| priorityLevels | 4 |
| quotes | 4 |
| userMemberships | 3 |
| companies | 2 |
| webForms | 2 |
| attachments | 1 |
| datasets | 1 |
| deletedRoleIds | 1 |
| discountApprovalRequests | 1 |
| googleAccounts | 1 |
| marketingProjects | 1 |

Collections expected by the application but absent in the live database are treated as zero-record collections. These include `presalesRequests`, `pocRecords`, `syncedEmails` and `syncedEvents`.

## Duplicate candidates

This check normalizes case and whitespace. Website checks also remove protocol, `www` and URL paths. A candidate is not automatically safe to merge.

| Entity/key | Duplicate groups | Records in groups | Migration action |
| --- | ---: | ---: | --- |
| Account website domain | 41 | 83 | Review account identity and merge/alias before enforcing a unique domain rule. |
| Order number | 45 | 97 | Blocking: determine whether records are revisions, imports or true duplicates. |
| Customer PO number | 29 | 65 | Review by customer, vendor and PO date; the same PO may legitimately contain multiple lines/orders. |
| Account name | 0 | 0 | No exact normalized-name duplicates found. |
| Contact email | 0 | 0 | No duplicates found. |
| Contact phone | 0 | 0 | No duplicates found. |
| Lead email | 0 | 0 | No duplicates found. |
| Lead phone | 0 | 0 | No duplicates found. |
| Vendor name | 0 | 0 | No duplicates found. |
| Product name | 0 | 0 | No duplicates found. |

## Missing-reference candidates

The following counts identify source IDs that do not exist in the expected live collection. Some notification and audit references may be valid historical references to deleted users. Core financial and customer references require reconciliation before migration.

| Reference | Missing |
| --- | ---: |
| `auditLogs.userId → users` | 39 |
| `contacts.accountId → accounts` | 12 |
| `googleAccounts.userId → users` | 1 |
| `notifications.userId → users` | 1,904 |
| `opportunities.vendorId → vendors` | 13 |
| `orders.vendorId → vendors` | 155 |
| `orders.accountId → accounts` | 128 |
| `orders.contactId → contacts` | 1 |
| `products.vendorId → vendors` | 5 |
| `quotes.contactId → contacts` | 1 |
| `renewalRecords.contactId → contacts` | 283 |
| `renewalRecords.accountId → accounts` | 14 |
| `renewalRecords.vendorId → vendors` | 60 |
| `userMemberships.userId → users` | 2 |

## Schema observations

1. The live database contains more collections than the application inventory originally identified. `namedAccounts`, `datasets`, `datasetRecords`, `marketingProjects`, `notifications`, `ownershipConflicts`, `userActivity`, `authProfiles`, `attachments`, `priorityLevels` and approval/configuration collections must be included in the PostgreSQL design.
2. All 1,334 accounts have `companyId`, owner, country, city, industry and website fields. Many also contain imported `customFields`, multiple salesperson arrays and historical-source metadata.
3. All 1,060 contacts have account/company links and complete contact-shaped fields, but 12 account references do not resolve.
4. Leads contain nested BANT and custom-field objects. These need JSONB or normalized child tables without losing imported fields.
5. Opportunities contain product-line arrays and several historical renewal links. The migration must preserve them and distinguish renewal-created opportunities.
6. Quotes store line items as nested arrays. They must be split into `quotes` and `quote_lines` transactionally and totals reconciled.
7. Orders have two generations of financial fields (`softwareAmount`/`servicesAmount` and `softwareValue`/`servicesValue`). The migration needs deterministic precedence and a reconciliation report.
8. User documents still include a legacy password field on 10 records. This field must never be migrated. Authentication credentials remain with the identity provider.
9. One Google account exists, but OAuth credentials must not be copied as ordinary data. The user should reauthorize after cutover.
10. The live data includes 176 ownership-conflict records. These should migrate as review history, not automatically overwrite current ownership.

## Migration gates

The pilot migration must not begin until:

- Duplicate order-number groups are classified.
- Missing account, contact and vendor references have a documented repair or archival rule.
- Firebase users are mapped to Supabase identities, including deleted/historical users.
- Nested quote, opportunity, lead and order structures have destination columns or JSONB retention fields.
- Password-like fields and OAuth secrets are excluded.
- Financial precedence rules are defined and tested against totals.
- The newly discovered collections are added to the migration map.

## Recommended next action

Create the PostgreSQL staging schema and migration-control tables without connecting production `crmnew` to them. The staging schema should include external source IDs, import batches, exception records, identity mappings and the missing crmnew modules. Then load a small pilot subset for one company and reconcile it before any production cutover.
