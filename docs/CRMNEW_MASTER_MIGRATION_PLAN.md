# crmnew Master Database Migration Plan

Date: 24 October 2026

## Objective

Keep `crmnew.amrutsoftware.in` as the master CRM application and move its durable business data from Cloud Firestore to the shared PostgreSQL database used by `crm.amrutsoftware.in`. The transition must preserve record ownership, relationships, permissions, audit history, and a tested rollback path.

## Current systems

| System | Application | Authentication | Database |
| --- | --- | --- | --- |
| crmnew | React/Vite, Firebase Hosting | Firebase Authentication | Cloud Firestore database `ai-studio-amrutcrmenterpri-21d4b3fe-9d3a-40be-887c-3c3e44436203` |
| crm | React/Vite, Cloudflare deployment | Supabase Authentication | PostgreSQL project `fkfqjzxsnumxhjaiofqf` |

The applications cannot share data by changing a connection string. Firestore documents must be mapped to relational tables, and `crmnew` needs a PostgreSQL data adapter and PostgreSQL-compatible authentication/authorization.

## Rollback checkpoint

- Source checkpoint commit: `2267894`
- Tag: `pre-postgres-migration-2026-10-24`
- Production Firestore remains unchanged until final cutover.
- A Firestore export and PostgreSQL backup are mandatory immediately before the pilot and final cutover.

## Collection mapping

| crmnew Firestore collection | PostgreSQL destination | Treatment |
| --- | --- | --- |
| `users` | `profiles` plus `auth.users` identity map | Transform Firebase UID, role, manager, territory, active state and assignment eligibility. Preserve the old UID in an external-ID column. |
| `roles` | `roles` | Merge by normalized role name and then map every user. |
| `companies` | `companies` | Merge by legal name/GST. Add any crmnew-only address and configuration fields. |
| `userMemberships` | `user_companies` | Direct junction-table mapping after user/company IDs are resolved. |
| `accounts` | `accounts` | Merge using normalized company name, website domain, GST and country. Preserve owner and company. |
| `contacts` | `contacts` | Merge primarily by normalized email; use account plus phone when email is absent. |
| `leads` | `leads` | Transform statuses, source/campaign, owner/reporter, product/vendor and linked account/contact. |
| `assignmentHistory` | `lead_assignments` | Map previous/new owner and assignment timestamps. Retain unsupported metadata in JSONB. |
| `opportunities` | `opportunities` | Transform stages, probability, values, forecast, source/campaign and ownership. |
| `presalesRequests` | new `presales_requests` table | New normalized table linked to opportunity, account, requester and assignee. |
| `pocRecords` | new `poc_records` table | New table linked to presales request/opportunity with outcome and activity dates. |
| `quotes` | `quotes` and `quote_lines` | Split nested line items into rows. Recalculate and reconcile totals before acceptance. |
| `orders` | `orders` and `order_items` | Split nested items/documents and map software/services values separately. |
| `vendors` | `vendors` | Merge by normalized vendor name; preserve heads and secondary owners with a junction table if required. |
| `products` | `vendor_products` | Map vendor, family, price, discounts and unit. |
| `vendorTargets` | `sales_targets` | Map user/vendor/company/financial year and product/services targets. |
| `renewalRecords` | new or extended renewal table | Preserve source order, dates, value, owner and renewal status. |
| `tasks` | `followup_tasks` | Map entity type/ID, owner, creator, priority, status, start/due dates and reminders. |
| `googleAccounts` | `oauth_tokens` | Do not copy browser tokens as plain data. Reauthorize each account and store server-side encrypted tokens. |
| `syncedEmails` | `email_messages` | Preserve mailbox owner and linked CRM records; enforce mailbox-level access. |
| `syncedEvents` | `calendar_events` | Preserve account owner and linked CRM records. |
| `workflows` | new `workflow_definitions` tables | Store module, states, transitions, mandatory fields and approval rules. Enforce transitions server-side. |
| `fieldSecurityRules` | new `field_security_rules` table | Convert UI rules into server-enforced policies/API checks. |
| `fieldAttributes` | `custom_fields` plus new metadata where needed | Map field definitions, options, validation and module visibility. |
| `webForms` | new `web_forms` tables | Preserve form definitions and add a secure public submission endpoint with spam controls. |
| `auditLogs` | `audit_log` | Preserve original timestamp, actor, entity and old/new values; make migrated entries immutable. |
| `namedAccounts` | `accounts` plus named-account metadata | Match to the canonical account, retain primary/secondary ownership and source-import information. |
| `datasets` / `datasetRecords` | `growth_import_batches` / `growth_database_records` | Preserve import source, tags, validation status and conversion lineage. |
| `marketingProjects` | `campaigns` or `communication_campaigns` | Map project type, dates, ownership and linked datasets after campaign-type review. |
| `notifications` | `notifications` | Retain valid-user notifications; archive historical notifications whose user no longer exists. |
| `ownershipConflicts` | new ownership-conflict history table | Preserve review decisions; never overwrite current owners automatically. |
| `userActivity` | login/action reporting table | Preserve user action, date and entity context for daily/weekly reporting. |
| `authProfiles` | identity mapping table | Use to connect Firebase UIDs to CRM users and new Supabase identities. |
| `attachments` | object storage plus attachment metadata | Copy binaries separately and retain entity links and checksums. |
| `priorityLevels` / `discountApprovalRequests` / `deletedRoleIds` | configuration and approval tables | Preserve configuration and historical approval state with explicit relational mappings. |

## Required schema additions

Before importing data, PostgreSQL needs migrations for:

1. External source IDs on migrated records, unique per source and collection.
2. Presales requests and POC records.
3. Workflow definitions, states and transitions.
4. Field-security configuration and server-side enforcement.
5. Web-form definitions and submissions.
6. Renewal records if the existing order-renewal representation cannot retain all crmnew fields.
7. Vendor secondary-owner relationships.
8. Import batches, migration errors and reconciliation results.
9. Identity mapping between Firebase UIDs and Supabase user UUIDs.

## Execution sequence

### Phase A — read-only preparation

1. Export collection counts, field profiles and relationship references from Firestore.
2. Export PostgreSQL schema and row counts.
3. Build identity, status, stage, company, vendor and product mapping tables.
4. Identify duplicates without modifying either source.
5. Approve reconciliation rules for ambiguous records.

### Phase B — schema and adapter

1. Add the required PostgreSQL tables, constraints, indexes and row-level security.
2. Build a `crmnew` repository layer that matches the current Firestore collection API.
3. Move critical workflow and permission validation to PostgreSQL functions or a secure API.
4. Add feature flags so a test build can switch between Firestore and PostgreSQL.

### Phase C — pilot migration

1. Back up both live databases.
2. Import users and reference data first.
3. Import one company and a limited set of accounts, contacts, leads, opportunities, quotes and orders.
4. Test every create, view, edit, approval, assignment and reporting workflow.
5. Reconcile row counts, financial totals, owners, relationships and audit entries.

### Phase D — final cutover

1. Announce a short write-freeze window.
2. Take final Firestore and PostgreSQL backups.
3. Run the full idempotent migration, followed by an incremental pass for records changed since the pilot snapshot.
4. Deploy `crmnew` with PostgreSQL enabled.
5. Run automated smoke checks and business reconciliation.
6. Keep Firestore read-only during the rollback window.

## Acceptance checks

- All active users can sign in and retain the correct role, company and reporting manager.
- Source and destination counts reconcile, with every exclusion documented.
- No duplicate account, contact email, lead or order is created by migration.
- Every foreign-key relationship resolves or appears in an exception report.
- Quote and order totals match the source values.
- Lead and opportunity owners, statuses and stages match.
- Attachments and linked records open correctly.
- Dashboards and reports match agreed source totals.
- Unauthorized cross-company and cross-user access is rejected by the server.
- Create/update/assignment/approval workflows work under concurrent use.

## Rollback

If a blocking issue appears after cutover:

1. Disable PostgreSQL writes from `crmnew`.
2. Redeploy source checkpoint `2267894`.
3. Restore Firestore write access.
4. Export PostgreSQL changes made after cutover to an exception file so they can be replayed later.
5. Diagnose and repeat the incremental migration after correction.

Rollback must be exercised once in staging before production cutover.
