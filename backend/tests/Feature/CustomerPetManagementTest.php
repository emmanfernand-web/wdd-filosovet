<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Permission;
use App\Models\Pet;
use App\Models\Role;
use App\Models\User;
use App\Services\PetService;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\Support\InMemoryDatabaseTestCase;

class CustomerPetManagementTest extends InMemoryDatabaseTestCase
{
    private function user(string $role = 'customer'): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('slug', $role)->firstOrFail());

        return $user;
    }

    private function customer(?User $user = null): Customer
    {
        return ($user ?? $this->user())->customer()->create(['phone' => '0812345', 'address' => 'Jakarta']);
    }

    private function pet(Customer $customer, array $overrides = []): Pet
    {
        return $customer->pets()->create(array_merge(['name' => 'Milo', 'species' => 'cat'], $overrides));
    }

    public function test_guest_endpoints_return_json_401_even_without_accept_header(): void
    {
        $this->get('/api/v1/me/customer')->assertUnauthorized()->assertJsonStructure(['message']);
        $this->postJson('/api/v1/customers', [])->assertUnauthorized();
        $this->get('/api/v1/pets/1')->assertUnauthorized();
    }

    public function test_customer_can_retrieve_own_profile_without_sensitive_fields(): void
    {
        $customer = $this->customer();
        $this->actingAs($customer->user)->getJson('/api/v1/me/customer')
            ->assertOk()->assertJsonPath('data.id', $customer->id)
            ->assertJsonPath('data.name', $customer->user->name)
            ->assertJsonPath('data.email', $customer->user->email)
            ->assertJsonMissingPath('data.password')->assertJsonMissingPath('data.remember_token')
            ->assertJsonMissingPath('data.roles')->assertJsonMissingPath('data.user');
        $this->getJson('/api/v1/customers/'.$customer->id)->assertOk();
    }

    public function test_customer_cannot_retrieve_another_profile(): void
    {
        $this->actingAs($this->user())->getJson('/api/v1/customers/'.$this->customer()->id)->assertForbidden();
    }

    public function test_customer_can_update_own_account_and_profile(): void
    {
        $customer = $this->customer();
        $this->actingAs($customer->user)->patchJson('/api/v1/me/customer', [
            'name' => 'Updated Name', 'email' => 'updated@example.test', 'phone' => null, 'address' => 'Bandung',
        ])->assertOk()->assertJsonPath('data.name', 'Updated Name')->assertJsonPath('data.address', 'Bandung')
            ->assertJsonPath('data.phone', null);
        $this->assertNull($customer->user->fresh()->email_verified_at);
        $this->assertSame('updated@example.test', $customer->user->fresh()->email);
    }

    public function test_customer_cannot_update_another_profile(): void
    {
        $customer = $this->customer();
        $this->actingAs($this->user())->patchJson('/api/v1/customers/'.$customer->id, ['address' => 'Other'])->assertForbidden();
        $this->assertSame('Jakarta', $customer->fresh()->address);
    }

    public function test_profile_update_rejects_duplicate_email_and_privileged_input(): void
    {
        $customer = $this->customer();
        $other = $this->user();
        $this->actingAs($customer->user)->patchJson('/api/v1/me/customer', ['email' => $other->email])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->patchJson('/api/v1/me/customer', ['roles' => ['admin'], 'is_active' => false, 'user_id' => $other->id, 'password' => 'ignored'])
            ->assertUnprocessable()->assertJsonValidationErrors(['roles', 'is_active', 'user_id', 'password']);
        $this->assertTrue($customer->user->fresh()->is_active);
        $this->assertFalse($customer->user->hasRole('admin'));
    }

    public function test_customer_can_list_only_their_own_pets(): void
    {
        $customer = $this->customer();
        $pet = $this->pet($customer);
        $other = $this->customer();
        $this->pet($other, ['name' => 'Other Pet']);
        $this->actingAs($customer->user)->getJson('/api/v1/customers/'.$customer->id.'/pets')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $pet->id)
            ->assertJsonStructure(['links', 'meta']);
        $this->getJson('/api/v1/customers/'.$other->id.'/pets')->assertForbidden();
    }

    public function test_customer_can_create_own_pet_including_an_uncommon_species(): void
    {
        $customer = $this->customer();
        $this->actingAs($customer->user)->postJson('/api/v1/customers/'.$customer->id.'/pets', [
            'name' => 'Kura', 'species' => 'Sulcata tortoise', 'gender' => 'unknown', 'weight' => 2.345,
            'date_of_birth' => '2024-02-29', 'microchip_number' => 'CHIP-001',
        ])->assertCreated()->assertJsonPath('data.customer_id', $customer->id)
            ->assertJsonPath('data.species', 'Sulcata tortoise')->assertJsonPath('data.weight', '2.345');
        $this->assertDatabaseHas('pets', ['customer_id' => $customer->id, 'name' => 'Kura']);
    }

    public function test_customer_cannot_create_pet_for_another_owner_or_override_owner_in_payload(): void
    {
        $customer = $this->customer();
        $other = $this->customer();
        $this->actingAs($customer->user)->postJson('/api/v1/customers/'.$other->id.'/pets', ['name' => 'Other', 'species' => 'cat'])->assertForbidden();
        $this->postJson('/api/v1/customers/'.$customer->id.'/pets', ['name' => 'Other', 'species' => 'cat', 'customer_id' => $other->id])
            ->assertUnprocessable()->assertJsonValidationErrors('customer_id');
        $this->assertSame(0, Pet::count());
    }

    public function test_cross_owner_pet_show_update_and_delete_are_denied(): void
    {
        $pet = $this->pet($this->customer());
        $this->actingAs($this->user())->getJson('/api/v1/pets/'.$pet->id)->assertForbidden();
        $this->patchJson('/api/v1/pets/'.$pet->id, ['name' => 'Stolen'])->assertForbidden();
        $this->deleteJson('/api/v1/pets/'.$pet->id)->assertForbidden();
        $this->assertSame('Milo', $pet->fresh()->name);
        $this->assertFalse($pet->fresh()->trashed());
    }

    public function test_owner_can_view_update_and_archive_pet(): void
    {
        $customer = $this->customer();
        $pet = $this->pet($customer);
        $this->actingAs($customer->user)->getJson('/api/v1/pets/'.$pet->id)->assertOk();
        $this->patchJson('/api/v1/pets/'.$pet->id, ['name' => 'Milo II', 'weight' => 4.125])->assertOk()->assertJsonPath('data.name', 'Milo II');
        $this->deleteJson('/api/v1/pets/'.$pet->id)->assertNoContent();
        $this->assertSoftDeleted('pets', ['id' => $pet->id]);
        $this->getJson('/api/v1/pets/'.$pet->id)->assertNotFound();
        $this->getJson('/api/v1/customers/'.$customer->id.'/pets')->assertJsonCount(0, 'data');
    }

    public function test_authorized_receptionist_can_create_list_and_manage_customers(): void
    {
        $actor = $this->user('resepsionis');
        $response = $this->actingAs($actor)->postJson('/api/v1/customers', [
            'name' => 'New Customer', 'email' => 'new@example.test',
            'password' => 'Unique-Test-Password-428!', 'password_confirmation' => 'Unique-Test-Password-428!', 'phone' => '081111',
        ])->assertCreated()->assertJsonPath('data.name', 'New Customer')->assertJsonMissingPath('data.password');
        $customer = Customer::findOrFail($response->json('data.id'));
        $this->assertTrue($customer->user->hasRole('customer'));
        $this->assertFalse($customer->user->hasRole('resepsionis'));
        $this->assertTrue(Hash::check('Unique-Test-Password-428!', $customer->user->password));
        $this->getJson('/api/v1/customers')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/customers/'.$customer->id)->assertOk();
        $this->patchJson('/api/v1/customers/'.$customer->id, ['phone' => '082222'])->assertOk()->assertJsonPath('data.phone', '082222');
    }

    public function test_authorized_staff_can_manage_pets_for_customers(): void
    {
        $customer = $this->customer();
        $this->actingAs($this->user('resepsionis'));
        $response = $this->postJson('/api/v1/customers/'.$customer->id.'/pets', ['name' => 'Staff Pet', 'species' => 'bird'])->assertCreated();
        $id = $response->json('data.id');
        $this->getJson('/api/v1/customers/'.$customer->id.'/pets')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/pets/'.$id)->assertOk();
        $this->patchJson('/api/v1/pets/'.$id, ['notes' => 'Handled by staff'])->assertOk();
        $this->deleteJson('/api/v1/pets/'.$id)->assertNoContent();
    }

    public function test_customer_and_unrelated_staff_roles_cannot_use_staff_customer_operations(): void
    {
        foreach (['customer', 'kasir', 'inventory', 'dokter', 'groomer', 'hotel', 'pharmacist'] as $role) {
            $this->actingAs($this->user($role))->getJson('/api/v1/customers')->assertForbidden();
            $this->postJson('/api/v1/customers', [])->assertForbidden();
        }
    }

    public function test_invalid_pet_fields_are_rejected_without_creating_records(): void
    {
        $customer = $this->customer();
        $this->actingAs($customer->user)->postJson('/api/v1/customers/'.$customer->id.'/pets', [
            'name' => '', 'species' => '', 'gender' => 'invalid', 'date_of_birth' => '2025-02-30',
            'weight' => -1, 'microchip_number' => ['bad'],
        ])->assertUnprocessable()->assertJsonValidationErrors(['name', 'species', 'gender', 'date_of_birth', 'weight', 'microchip_number']);
        $this->assertSame(0, Pet::count());
    }

    public function test_future_birthdates_and_invalid_weight_ranges_are_rejected(): void
    {
        $customer = $this->customer();
        $pet = $this->pet($customer);
        $this->actingAs($customer->user);
        foreach ([0, -0.1, 10000.001, 'not-a-number', 1.2345] as $weight) {
            $this->patchJson('/api/v1/pets/'.$pet->id, ['weight' => $weight])->assertUnprocessable()->assertJsonValidationErrors('weight');
        }
        $this->patchJson('/api/v1/pets/'.$pet->id, ['date_of_birth' => now()->addDay()->toDateString()])
            ->assertUnprocessable()->assertJsonValidationErrors('date_of_birth');
    }

    public function test_microchip_uniqueness_allows_unchanged_value_and_multiple_nulls(): void
    {
        $customer = $this->customer();
        $first = $this->pet($customer, ['microchip_number' => 'UNIQUE-1']);
        $second = $this->pet($customer);
        $this->pet($customer);
        $this->actingAs($customer->user)->patchJson('/api/v1/pets/'.$first->id, ['microchip_number' => 'UNIQUE-1'])->assertOk();
        $this->patchJson('/api/v1/pets/'.$second->id, ['microchip_number' => 'UNIQUE-1'])
            ->assertUnprocessable()->assertJsonValidationErrors('microchip_number');
        $this->postJson('/api/v1/customers/'.$customer->id.'/pets', ['name' => 'Duplicate', 'species' => 'cat', 'microchip_number' => 'UNIQUE-1'])
            ->assertUnprocessable()->assertJsonValidationErrors('microchip_number');
    }

    public function test_database_rejects_duplicate_microchip_and_orphan_customer(): void
    {
        $customer = $this->customer();
        $this->pet($customer, ['microchip_number' => 'UNIQUE-1']);
        $this->expectException(QueryException::class);
        $this->pet($customer, ['microchip_number' => 'UNIQUE-1']);
    }

    public function test_pet_foreign_key_rejects_orphan_customer(): void
    {
        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('FOREIGN KEY constraint failed');
        DB::table('pets')->insert(['customer_id' => 999999, 'name' => 'Orphan', 'species' => 'cat']);
    }

    public function test_customer_with_pets_cannot_be_deleted_accidentally(): void
    {
        $customer = $this->customer();
        $this->pet($customer);
        $this->expectException(QueryException::class);
        $customer->delete();
    }

    public function test_relationships_and_owner_mass_assignment_protection(): void
    {
        $customer = $this->customer();
        $pet = $this->pet($customer);
        $other = $this->customer();
        $this->assertTrue($pet->customer->is($customer));
        $this->assertTrue($customer->pets->contains($pet));
        $this->assertTrue($pet->customer->user->is($customer->user));
        $pet->fill(['customer_id' => $other->id, 'name' => 'Safe']);
        $pet->save();
        $this->assertSame($customer->id, $pet->fresh()->customer_id);
    }

    public function test_pet_owner_cannot_be_reassigned_through_update_payload(): void
    {
        $customer = $this->customer();
        $pet = $this->pet($customer);
        $this->actingAs($customer->user)->patchJson('/api/v1/pets/'.$pet->id, ['customer_id' => $this->customer()->id])
            ->assertUnprocessable()->assertJsonValidationErrors('customer_id');
        $this->assertSame($customer->id, $pet->fresh()->customer_id);
    }

    public function test_inactive_accounts_cannot_use_any_module_endpoints(): void
    {
        $customer = $this->customer();
        $customer->user->forceFill(['is_active' => false])->save();
        $this->actingAs($customer->user)->getJson('/api/v1/me/customer')->assertForbidden();
        $this->getJson('/api/v1/customers/'.$customer->id.'/pets')->assertForbidden();
    }

    public function test_missing_customer_profile_and_unknown_resources_return_404(): void
    {
        $this->actingAs($this->user())->getJson('/api/v1/me/customer')->assertNotFound();
        $this->getJson('/api/v1/customers/999999')->assertNotFound();
        $this->getJson('/api/v1/pets/999999')->assertNotFound();
    }

    public function test_pagination_is_validated_and_staff_lists_do_not_return_pet_collections(): void
    {
        $customer = $this->customer();
        $this->pet($customer);
        $this->actingAs($this->user('resepsionis'))->getJson('/api/v1/customers?per_page=1')
            ->assertOk()->assertJsonPath('meta.per_page', 1)->assertJsonMissingPath('data.0.pets');
        $this->getJson('/api/v1/customers?per_page=101')->assertUnprocessable();
        $this->getJson('/api/v1/customers/'.$customer->id.'/pets?per_page=101')->assertUnprocessable();
    }

    public function test_new_customer_validation_is_atomic_and_cannot_grant_roles(): void
    {
        $existing = $this->customer();
        $this->actingAs($this->user('resepsionis'))->postJson('/api/v1/customers', [
            'name' => 'Duplicate', 'email' => $existing->user->email, 'password' => 'weak', 'password_confirmation' => 'weak', 'roles' => ['admin'],
        ])->assertUnprocessable()->assertJsonValidationErrors(['email', 'password', 'roles']);
        $this->assertSame(1, Customer::count());
    }

    public function test_service_calls_also_enforce_ownership_without_a_controller(): void
    {
        $pet = $this->pet($this->customer());
        $this->expectException(AuthorizationException::class);
        app(PetService::class)->update($this->user(), $pet, ['name' => 'Stolen']);
    }

    public function test_microchip_zero_is_preserved_and_empty_chip_becomes_null(): void
    {
        $customer = $this->customer();
        $this->actingAs($customer->user)->postJson('/api/v1/customers/'.$customer->id.'/pets', [
            'name' => 'Pet Zero', 'species' => 'cat', 'microchip_number' => '0',
        ])->assertCreated()->assertJsonPath('data.microchip_number', '0');
        $this->postJson('/api/v1/customers/'.$customer->id.'/pets', [
            'name' => 'Pet Empty', 'species' => 'cat', 'microchip_number' => '   ',
        ])->assertCreated()->assertJsonPath('data.microchip_number', null);
    }

    public function test_customer_management_permission_cannot_change_another_login_email(): void
    {
        $customer = $this->customer();
        $this->actingAs($this->user('resepsionis'))->patchJson('/api/v1/customers/'.$customer->id, [
            'email' => 'changed@example.test', 'address' => 'Uncommitted address',
        ])->assertForbidden();
        $this->assertNotSame('changed@example.test', $customer->user->fresh()->email);
        $this->assertSame('Jakarta', $customer->fresh()->address);
    }

    public function test_admin_can_change_customer_login_email(): void
    {
        $customer = $this->customer();
        $this->actingAs($this->user('admin'))->patchJson('/api/v1/customers/'.$customer->id, ['email' => 'admin-updated@example.test'])
            ->assertOk()->assertJsonPath('data.email', 'admin-updated@example.test');
    }

    public function test_revoked_own_pet_permission_is_effective_on_existing_user_instances(): void
    {
        $customer = $this->customer();
        $pet = $this->pet($customer);
        $customer->user->roles()->first()->permissions()->detach(Permission::where('slug', 'manage_own_pets')->value('id'));
        $this->actingAs($customer->user)->getJson('/api/v1/pets/'.$pet->id)->assertForbidden();
        $this->getJson('/api/v1/customers/'.$customer->id.'/pets')->assertForbidden();
        $this->postJson('/api/v1/customers/'.$customer->id.'/pets', ['name' => 'Denied', 'species' => 'cat'])->assertForbidden();
    }
}
