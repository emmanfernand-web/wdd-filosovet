# User & Access Management Implementation Plan

Goal: implement the supplied nine-role specification without changing frontend, legacy migrations, credentials, or existing records.

Architecture: native Eloquent many-to-many RBAC, database constraints, permission-backed Gates and ownership Policies; active-only Eloquent auth provider. No authentication endpoints or external packages.

1. Write failing feature tests on a new SQLite in-memory connection per test. Run only additive `migrate`, never reset an existing database.
2. Add two migrations: users.is_active, then roles/permissions/pivots/customer/staff profiles. Pivot FKs cascade; profile FKs restrict parent deletion. Preserve default user columns and existing tables.
3. Implement typed model relationships, guarded access attributes, role/permission checks backed by current database state, centralized permission catalog and idempotent seeders. Seed no accounts. Baseline grants apply only when creating a role; reruns preserve custom grants and revocations.
4. Register active-only auth provider, native Gates, ownership Policies, active middleware. Expose authorized transactional access-management service and validated account creation/profile update service, without adding API endpoints.
5. Run full tests, Pint, PHP syntax and configuration checks. Inspect MySQL tables/counts before additive migrations, migrate and seed only the access catalog, verify constraints and preserved table counts. Document usage, mapping and limitations.

Review focus: inactive sessions/remember tokens; stale role relations and revoked permissions; customer cross-account access; mass assignment and unauthorized grants; seeder repeatability and preservation of existing records.

No git commit/push, no frontend edits, no database configuration changes, no destructive commands. All work is performed in the requested backend checkout. The supplied task is the implementation specification; no additional architecture approval is needed for these reversible implementation choices.

Progress: baseline 2 tests passed; new feature tests observed RED before implementation, then 47/47 suite passed. Independent reviewer found no blocking issue; operational seeder revocation caveat reproduced with a failing test and addressed by initial-only grants.

Completed: 48/48 tests and 177 assertions; PHP syntax, Pint, Composer and runtime auth/middleware configuration verified. MySQL additive migrations and repeated seeding succeeded: 9 roles, 26 permissions, 68 grants, 6 foreign keys. Original nine tables/columns and record counts preserved (migrations gains 2 entries). No frontend, credentials, legacy migrations or existing SQLite changes; no commit/push.
