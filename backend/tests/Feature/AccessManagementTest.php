<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Permission;
use App\Models\Role;
use App\Models\StaffProfile;
use App\Models\User;
use App\Services\AccessManagementService;
use App\Services\UserAccountService;
use Database\Seeders\AccessControlSeeder;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class AccessManagementTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // No RefreshDatabase/migrate:fresh: this connection exists only in memory.
        config([
            'database.default' => 'access_testing',
            'database.connections.access_testing' => [
                'driver' => 'sqlite', 'database' => ':memory:',
                'prefix' => '', 'foreign_key_constraints' => true,
            ],
            'cache.default' => 'array',
            'session.driver' => 'array',
        ]);
        DB::purge('access_testing');
        $this->artisan('migrate', ['--database' => 'access_testing', '--force' => true])->assertSuccessful();
        $this->seed(AccessControlSeeder::class);
    }

    private function role(string $slug): Role
    {
        return Role::where('slug', $slug)->firstOrFail();
    }

    private function userWithRole(string $slug): User
    {
        $user = User::factory()->create();
        $user->roles()->attach($this->role($slug));

        return $user;
    }

    public function test_user_can_have_one_or_multiple_roles_with_created_timestamps(): void
    {
        $user = $this->userWithRole('dokter');
        $user->roles()->attach($this->role('customer'));

        $this->assertCount(2, $user->roles);
        $this->assertTrue($user->hasRole('dokter'));
        $this->assertTrue($user->hasRole('customer'));
        $this->assertFalse($user->hasRole('admin'));
        $this->assertNotNull($user->roles->first()->pivot->created_at);
        $this->assertTrue($this->role('dokter')->users->contains($user));
    }

    public function test_roles_have_multiple_permissions_and_inverse_relationship(): void
    {
        $role = $this->role('dokter');
        $permission = Permission::where('slug', 'manage_medical_records')->firstOrFail();

        $this->assertGreaterThan(1, $role->permissions()->count());
        $this->assertTrue($permission->roles->contains($role));
        $this->assertNotNull($role->permissions->first()->pivot->created_at);
    }

    public function test_permissions_are_union_of_roles_and_revocations_take_effect_without_relation_cache(): void
    {
        $user = $this->userWithRole('dokter');
        $user->load('roles.permissions');
        $this->assertTrue($user->hasPermission('manage_medical_records'));
        $this->assertFalse($user->hasPermission('manage_inventory'));
        $user->roles()->attach($this->role('inventory'));
        $this->assertTrue($user->hasPermission('manage_inventory'));
        $this->role('dokter')->permissions()->detach(Permission::where('slug', 'manage_medical_records')->value('id'));
        $this->assertFalse($user->hasPermission('manage_medical_records'));
        $this->assertFalse($user->hasPermission('unknown_permission'));
    }

    public function test_customer_and_staff_profiles_are_unique_connected_and_can_coexist(): void
    {
        $user = User::factory()->create();
        $customer = $user->customer()->create(['phone' => '08123456789']);
        $staff = $user->staffProfile()->create(['employee_number' => 'EMP-001', 'hire_date' => '2026-11-12']);

        $this->assertTrue($customer->user->is($user));
        $this->assertTrue($staff->user->is($user));
        $this->assertTrue($user->customer->is($customer));
        $this->assertTrue($user->staffProfile->is($staff));
        $this->assertSame('2026-11-12', $staff->hire_date->toDateString());
    }

    public function test_duplicate_role_assignment_is_rejected_by_database(): void
    {
        $user = $this->userWithRole('dokter');
        $this->expectException(QueryException::class);
        $user->roles()->attach($this->role('dokter'));
    }

    public function test_duplicate_permission_assignment_is_rejected_by_database(): void
    {
        $role = $this->role('dokter');
        $this->expectException(QueryException::class);
        $role->permissions()->attach($role->permissions->first());
    }

    public function test_duplicate_customer_profile_is_rejected(): void
    {
        $user = User::factory()->create();
        $user->customer()->create([]);
        $this->expectException(QueryException::class);
        $user->customer()->create([]);
    }

    public function test_duplicate_staff_profile_is_rejected(): void
    {
        $user = User::factory()->create();
        $user->staffProfile()->create(['employee_number' => 'EMP-1']);
        $this->expectException(QueryException::class);
        $user->staffProfile()->create(['employee_number' => 'EMP-2']);
    }

    public function test_duplicate_employee_number_is_rejected(): void
    {
        User::factory()->create()->staffProfile()->create(['employee_number' => 'EMP-1']);
        $this->expectException(QueryException::class);
        User::factory()->create()->staffProfile()->create(['employee_number' => 'EMP-1']);
    }

    public function test_profile_prevents_accidental_user_deletion(): void
    {
        $user = $this->userWithRole('customer');
        $user->customer()->create([]);
        $this->expectException(QueryException::class);
        $user->delete();
    }

    public function test_pivot_foreign_keys_cascade_without_orphan_rows(): void
    {
        $user = $this->userWithRole('customer');
        $user->delete();
        $this->assertDatabaseMissing('user_roles', ['user_id' => $user->id]);
        $role = Role::create(['name' => 'Temporary', 'slug' => 'temporary']);
        $permission = Permission::create(['name' => 'Temporary', 'slug' => 'temporary']);
        $other = User::factory()->create();
        $other->roles()->attach($role);
        $role->permissions()->attach($permission);
        $permission->delete();
        $this->assertDatabaseMissing('role_permissions', ['permission_id' => $permission->id]);
        $role->delete();
        $this->assertDatabaseMissing('user_roles', ['role_id' => $role->id]);
    }

    public function test_foreign_keys_reject_nonexistent_users(): void
    {
        $this->expectException(QueryException::class);
        DB::table('user_roles')->insert(['user_id' => 999999, 'role_id' => $this->role('customer')->id]);
    }

    public function test_default_database_seeder_is_idempotent_and_creates_no_accounts(): void
    {
        $this->seed(DatabaseSeeder::class);
        $roleCount = Role::count();
        $permissionCount = Permission::count();
        $pivotCount = DB::table('role_permissions')->count();
        $this->seed(DatabaseSeeder::class);
        $this->assertSame(9, $roleCount);
        $this->assertSame($roleCount, Role::count());
        $this->assertSame($permissionCount, Permission::count());
        $this->assertSame($pivotCount, DB::table('role_permissions')->count());
        $this->assertSame(0, User::count());
    }

    public function test_role_mapping_separates_pharmacy_inventory_and_customer_access(): void
    {
        $pharmacist = $this->userWithRole('pharmacist');
        $inventory = $this->userWithRole('inventory');
        $customer = $this->userWithRole('customer');
        $admin = $this->userWithRole('admin');
        $this->assertTrue($pharmacist->hasPermission('dispense_prescriptions'));
        $this->assertFalse($pharmacist->hasPermission('manage_inventory'));
        $this->assertFalse($inventory->hasPermission('manage_prescriptions'));
        $this->assertTrue($inventory->hasPermission('manage_suppliers'));
        $this->assertTrue($customer->hasPermission('view_own_bookings'));
        $this->assertFalse($customer->hasPermission('view_bookings'));
        $this->assertFalse($customer->hasPermission('manage_users'));
        foreach (Permission::pluck('slug') as $slug) {
            $this->assertTrue($admin->hasPermission($slug), $slug);
        }
    }

    public function test_inactive_account_cannot_login_validate_or_use_remember_token(): void
    {
        $user = User::factory()->create(['is_active' => false, 'remember_token' => 'test-token']);
        $credentials = ['email' => $user->email, 'password' => 'password'];
        $this->assertFalse(Auth::attempt($credentials));
        $this->assertFalse(Auth::validate($credentials));
        $provider = Auth::getProvider();
        $this->assertNull($provider->retrieveById($user->id));
        $this->assertNull($provider->retrieveByToken($user->id, 'test-token'));
        $this->assertFalse($provider->validateCredentials($user, $credentials));
    }

    public function test_active_account_can_login_and_deactivation_blocks_session_restoration(): void
    {
        $user = User::factory()->create();
        $this->assertTrue(Auth::attempt(['email' => $user->email, 'password' => 'password']));
        $this->assertTrue(Auth::user()->is($user));
        $user->forceFill(['is_active' => false])->save();
        Auth::forgetGuards();
        $this->assertNull(Auth::user());
    }

    public function test_wrong_password_is_rejected(): void
    {
        $user = User::factory()->create();
        $this->assertFalse(Auth::attempt(['email' => $user->email, 'password' => 'wrong']));
    }

    public function test_permission_gates_and_inactive_account_denials(): void
    {
        $user = $this->userWithRole('dokter');
        $this->assertTrue(Gate::forUser($user)->allows('manage_medical_records'));
        $this->assertFalse(Gate::forUser($user)->allows('manage_users'));
        $user->forceFill(['is_active' => false])->save();
        $this->assertFalse($user->hasPermission('manage_medical_records'));
        $this->assertFalse(Gate::forUser($user)->allows('manage_medical_records'));
    }

    public function test_customer_policy_prevents_reading_or_updating_another_profile(): void
    {
        $owner = $this->userWithRole('customer');
        $other = $this->userWithRole('customer');
        $profile = $owner->customer()->create([]);
        $this->assertTrue(Gate::forUser($owner)->allows('view', $profile));
        $this->assertTrue(Gate::forUser($owner)->allows('update', $profile));
        $this->assertFalse(Gate::forUser($other)->allows('view', $profile));
        $this->assertFalse(Gate::forUser($other)->allows('update', $profile));
        $this->assertFalse(Gate::forUser($owner)->allows('viewAny', Customer::class));
        $this->assertTrue(Gate::forUser($this->userWithRole('resepsionis'))->allows('view', $profile));
    }

    public function test_access_service_authorizes_role_assignment_and_permission_sync(): void
    {
        $actor = $this->userWithRole('admin');
        $target = User::factory()->create();
        $service = app(AccessManagementService::class);
        $ids = [$this->role('dokter')->id, $this->role('customer')->id];
        $service->syncUserRoles($actor, $target, $ids);
        $service->syncUserRoles($actor, $target, $ids);
        $this->assertSame(2, $target->roles()->count());
        $role = Role::create(['name' => 'Custom', 'slug' => 'custom']);
        $permission = Permission::where('slug', 'view_reports')->firstOrFail();
        $service->syncRolePermissions($actor, $role, [$permission->id]);
        $this->assertSame([$permission->id], $role->permissions()->pluck('permissions.id')->all());
    }

    public function test_customer_cannot_grant_themselves_roles(): void
    {
        $customer = $this->userWithRole('customer');
        $this->expectException(AuthorizationException::class);
        app(AccessManagementService::class)->syncUserRoles($customer, $customer, [$this->role('admin')->id]);
    }

    public function test_customer_cannot_change_role_permissions(): void
    {
        $this->expectException(AuthorizationException::class);
        app(AccessManagementService::class)->syncRolePermissions($this->userWithRole('customer'), $this->role('customer'), Permission::pluck('id')->all());
    }

    public function test_invalid_role_sync_does_not_destroy_existing_assignments(): void
    {
        $target = $this->userWithRole('dokter');
        try {
            app(AccessManagementService::class)->syncUserRoles($this->userWithRole('admin'), $target, [99999]);
            $this->fail('Invalid role must be rejected.');
        } catch (ValidationException) {
            $this->assertTrue($target->hasRole('dokter'));
        }
    }

    public function test_validated_customer_registration_hashes_password_and_creates_profile_and_role(): void
    {
        $user = app(UserAccountService::class)->registerCustomer([
            'name' => 'Customer', 'email' => 'customer@example.test',
            'password' => 'Strong-Test-Password-428!', 'password_confirmation' => 'Strong-Test-Password-428!',
            'phone' => '08123456789', 'address' => 'Jakarta',
        ]);
        $this->assertTrue(Hash::check('Strong-Test-Password-428!', $user->password));
        $this->assertTrue($user->is_active);
        $this->assertTrue($user->hasRole('customer'));
        $this->assertSame('08123456789', $user->customer->phone);
        $this->assertArrayNotHasKey('password', $user->toArray());
        $this->assertArrayNotHasKey('remember_token', $user->toArray());
    }

    public function test_registration_rejects_privileged_attributes(): void
    {
        $this->expectException(ValidationException::class);
        app(UserAccountService::class)->registerCustomer([
            'name' => 'Customer', 'email' => 'customer@example.test',
            'password' => 'Strong-Test-Password-428!', 'password_confirmation' => 'Strong-Test-Password-428!',
            'roles' => ['admin'], 'is_active' => true,
        ]);
    }

    public function test_registration_rejects_duplicate_email(): void
    {
        $user = User::factory()->create();
        $this->expectException(ValidationException::class);
        app(UserAccountService::class)->registerCustomer([
            'name' => 'Duplicate', 'email' => $user->email,
            'password' => 'Strong-Test-Password-428!', 'password_confirmation' => 'Strong-Test-Password-428!',
        ]);
    }

    public function test_database_rejects_duplicate_email_even_outside_validation(): void
    {
        $user = User::factory()->create();
        $this->expectException(QueryException::class);
        User::factory()->create(['email' => $user->email]);
    }

    public function test_weak_password_is_rejected(): void
    {
        $this->expectException(ValidationException::class);
        app(UserAccountService::class)->registerCustomer([
            'name' => 'Customer', 'email' => 'customer@example.test',
            'password' => '123', 'password_confirmation' => '123',
        ]);
    }

    public function test_authorized_account_status_change_blocks_login(): void
    {
        $user = User::factory()->create();
        app(AccessManagementService::class)->setUserActive($this->userWithRole('admin'), $user, false);
        $this->assertFalse($user->fresh()->is_active);
        $this->assertFalse(Auth::attempt(['email' => $user->email, 'password' => 'password']));
    }

    public function test_inactive_actor_cannot_manage_access(): void
    {
        $actor = $this->userWithRole('admin');
        $actor->forceFill(['is_active' => false])->save();
        $this->expectException(AuthorizationException::class);
        app(AccessManagementService::class)->setUserActive($actor, User::factory()->create(), false);
    }

    public function test_active_middleware_rejects_a_disabled_user_already_in_guard_memory(): void
    {
        Route::get('/test-active', fn () => response()->json(['ok' => true]))->middleware('active');
        $user = User::factory()->create(['is_active' => false]);
        $this->actingAs($user)->getJson('/test-active')->assertForbidden();
    }

    public function test_customer_cannot_view_another_staff_profile(): void
    {
        $staff = User::factory()->create()->staffProfile()->create(['employee_number' => 'EMP-2']);
        $this->assertFalse(Gate::forUser($this->userWithRole('customer'))->allows('view', $staff));
        $this->assertTrue(Gate::forUser($this->userWithRole('admin'))->allows('view', $staff));
    }

    public function test_permission_named_like_policy_action_does_not_bypass_ownership(): void
    {
        $attacker = $this->userWithRole('customer');
        $permission = Permission::create(['name' => 'View', 'slug' => 'view']);
        $attacker->roles()->first()->permissions()->attach($permission);
        $other = User::factory()->create()->customer()->create([]);
        $this->assertFalse(Gate::forUser($attacker)->allows('view', $other));
    }

    public function test_custom_permission_is_available_through_native_gate(): void
    {
        $user = $this->userWithRole('customer');
        $permission = Permission::create(['name' => 'Custom export', 'slug' => 'custom_export']);
        $user->roles()->first()->permissions()->attach($permission);
        $this->assertTrue(Gate::forUser($user)->allows('custom_export'));
    }

    public function test_privileged_fields_are_not_mass_assignable(): void
    {
        $user = User::factory()->create();
        $user->fill(['name' => 'Safe name', 'is_active' => false, 'role_ids' => [$this->role('admin')->id], 'email_verified_at' => now()]);
        $user->save();
        $this->assertTrue($user->fresh()->is_active);
        $this->assertFalse($user->hasRole('admin'));
        $customer = $user->customer()->create([]);
        $other = User::factory()->create();
        $customer->fill(['user_id' => $other->id])->save();
        $this->assertSame($user->id, $customer->fresh()->user_id);
    }

    public function test_staff_profile_blocks_deletion_and_rejects_orphan(): void
    {
        $user = User::factory()->create();
        $user->staffProfile()->create(['employee_number' => 'EMP-3']);
        $this->expectException(QueryException::class);
        $user->delete();
    }

    public function test_customer_foreign_key_rejects_orphan(): void
    {
        $this->expectException(QueryException::class);
        DB::table('customers')->insert(['user_id' => 999999]);
    }

    public function test_staff_foreign_key_rejects_orphan(): void
    {
        $this->expectException(QueryException::class);
        DB::table('staff_profiles')->insert(['user_id' => 999999, 'employee_number' => 'ORPHAN']);
    }

    public function test_permission_assignment_rejects_unknown_permission_without_detaching_current_ones(): void
    {
        $role = $this->role('dokter');
        $count = $role->permissions()->count();
        try {
            app(AccessManagementService::class)->syncRolePermissions($this->userWithRole('admin'), $role, [999999]);
            $this->fail('Invalid permission must be rejected.');
        } catch (ValidationException) {
            $this->assertSame($count, $role->permissions()->count());
        }
    }

    public function test_unauthorized_actor_cannot_change_account_status(): void
    {
        $this->expectException(AuthorizationException::class);
        app(AccessManagementService::class)->setUserActive($this->userWithRole('customer'), User::factory()->create(), false);
    }

    public function test_admin_can_create_staff_account_with_multiple_roles(): void
    {
        $user = app(UserAccountService::class)->createStaff($this->userWithRole('admin'), [
            'name' => 'Staff', 'email' => 'staff@example.test',
            'password' => 'Strong-Test-Password-428!', 'password_confirmation' => 'Strong-Test-Password-428!',
            'employee_number' => 'EMP-004', 'phone' => '08123', 'hire_date' => '2026-11-12',
        ], [$this->role('dokter')->id, $this->role('pharmacist')->id]);
        $this->assertTrue($user->hasRole('dokter'));
        $this->assertTrue($user->hasRole('pharmacist'));
        $this->assertSame('EMP-004', $user->staffProfile->employee_number);
        $this->assertNull($user->customer);
    }

    public function test_customer_cannot_create_staff_account(): void
    {
        $this->expectException(AuthorizationException::class);
        app(UserAccountService::class)->createStaff($this->userWithRole('customer'), [], [$this->role('admin')->id]);
    }

    public function test_staff_creation_is_atomic_when_role_assignment_fails(): void
    {
        $actor = $this->userWithRole('admin');
        try {
            app(UserAccountService::class)->createStaff($actor, [
                'name' => 'Staff', 'email' => 'staff@example.test',
                'password' => 'Strong-Test-Password-428!', 'password_confirmation' => 'Strong-Test-Password-428!',
                'employee_number' => 'EMP-004',
            ], [999999]);
            $this->fail('Invalid role must fail.');
        } catch (ValidationException) {
            $this->assertDatabaseMissing('users', ['email' => 'staff@example.test']);
            $this->assertSame(0, StaffProfile::count());
        }
    }

    public function test_own_profile_update_is_validated_and_authorized(): void
    {
        $user = $this->userWithRole('customer');
        $profile = $user->customer()->create([]);
        app(UserAccountService::class)->updateCustomerProfile($user, $profile, ['phone' => '081234', 'address' => 'Bandung']);
        $this->assertSame('Bandung', $profile->fresh()->address);
        $this->expectException(AuthorizationException::class);
        app(UserAccountService::class)->updateCustomerProfile($this->userWithRole('customer'), $profile, ['phone' => 'invalid']);
    }

    public function test_customer_profile_update_cannot_reassign_owner(): void
    {
        $user = $this->userWithRole('customer');
        $profile = $user->customer()->create([]);
        $this->expectException(ValidationException::class);
        app(UserAccountService::class)->updateCustomerProfile($user, $profile, ['user_id' => User::factory()->create()->id]);
    }

    public function test_reseeding_preserves_administrator_permission_customizations(): void
    {
        $role = $this->role('dokter');
        $revoked = Permission::where('slug', 'manage_medical_records')->firstOrFail();
        $custom = Permission::create(['name' => 'Custom', 'slug' => 'custom_access']);
        $role->permissions()->detach($revoked);
        $role->permissions()->attach($custom);
        $this->seed(AccessControlSeeder::class);
        $this->assertFalse($role->permissions()->whereKey($revoked->id)->exists());
        $this->assertTrue($role->permissions()->whereKey($custom->id)->exists());
    }
}
