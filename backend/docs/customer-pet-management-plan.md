# Module 2 Implementation Plan

Specification: user attachment “Module 2: Customer & Pet Management — Laravel Backend”. Work on branch tes-laravel and preserve all uncommitted Module 1 changes.

Architecture: reuse existing Customer/User, CustomerPolicy and UserAccountService. Add native REST controllers, FormRequests, Resources and domain services. Route prefix /api/v1, protected by existing default auth guard and active middleware. No login/token/session/CORS mechanism is introduced.

1. Add HTTP feature tests using the Module 1 explicit SQLite in-memory connection pattern and additive migrate. Observe missing feature failures, then implement.
2. New pets migration: customer FK RESTRICT, standard suggested fields, decimal(8,3) weight, nullable unique microchip, customer/name index. Soft deletes preserve pet records for future clinical references (clear purpose for deleted_at). No old migration edits or customer schema recreation.
3. Add Pet model, Customer.pets, PetPolicy, customer create policy. Staff capabilities use manage_customers/manage_pets independently. Owner pet actions require manage_own_pets. Parent and resource policy checks prevent cross-owner and payload owner changes.
4. Central validation rules reused by FormRequests/services; species accepts nonempty descriptive text (not a dog/cat enum), sex male/female/intersex/unknown/null, date YYYY-MM-DD not future, weight >0 and <=10000 kg with up to 3 decimals. Microchip uniqueness includes archived records. No ownership transfer through normal updates.
5. Customer service reuses Module 1 account creation; profile update extends existing service transactionally to support account name/email plus phone/address, resetting email verification when email changes. Password/role/status/account-owner input remains prohibited during profile updates.
6. Implement endpoints for own customer, staff customer list/create, authorized customer show/update, nested pet list/create, pet show/update/archive. Paginate lists with max 100. Explicit Resources exclude credentials, role/permission grants and staff data.
7. Run all tests/Pint/syntax, independent code review, safe additive MySQL migration, metadata/index/FK verification and before/after Module 1 data fingerprints. Do not reseed or mutate Module 1 catalog.

No destructive database commands, frontend changes, commit/push/merge/reset or Module 3 implementation. Existing API authentication is a future integration dependency: unauthenticated requests return JSON 401, tests use Laravel actingAs with real permissions.

Completed: 79 tests / 377 assertions passed; all original tests retained. Independent read-only review: no important findings. Additive MySQL pets migration succeeded; original 15 tables/record fingerprints preserved, 9 roles/26 permissions/68 grants unchanged. Ruling: modifying another account login email requires manage_users, while own-profile updates remain allowed; protects multi-role accounts from login identity changes via customer-management permission.
