<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\InventoryCatalogService;
use App\Services\InventoryService;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Testing\TestResponse;
use Illuminate\Validation\ValidationException;
use Tests\Support\InMemoryDatabaseTestCase;

class InventoryPharmacyManagementTest extends InMemoryDatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now('UTC')->startOfDay());
    }

    private function actor(string $role = 'inventory'): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('slug', $role)->firstOrFail());

        return $user;
    }

    private function product(array $overrides = []): int
    {
        return $this->actingAs($this->actor())->postJson('/api/v1/products', array_merge([
            'sku' => 'SKU-'.fake()->unique()->uuid(), 'name' => 'Approved product', 'type' => 'general', 'unit' => 'piece', 'minimum_stock' => 5,
        ], $overrides))->assertCreated()->json('data.id');
    }

    private function batch(int $product, array $overrides = []): int
    {
        return $this->actingAs($this->actor())->postJson('/api/v1/products/'.$product.'/batches', array_merge([
            'batch_number' => 'B-'.fake()->unique()->uuid(), 'expiry_date' => now()->addYear()->toDateString(),
        ], $overrides))->assertCreated()->json('data.id');
    }

    public function test_inventory_starts_without_demo_records(): void
    {
        foreach (['product_categories', 'products', 'product_batches', 'stock_movements'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
    }

    public function test_manager_can_manage_category_and_product_and_deactivate(): void
    {
        $this->actingAs($this->actor());
        $category = $this->postJson('/api/v1/product-categories', ['name' => 'Care', 'slug' => 'care'])->assertCreated()->json('data.id');
        $id = $this->product(['product_category_id' => $category]);
        $this->patchJson('/api/v1/products/'.$id, ['name' => 'Updated', 'is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);
        $this->getJson('/api/v1/products/'.$id)->assertOk()->assertJsonPath('data.name', 'Updated');
        $this->patchJson('/api/v1/products/'.$id, ['is_active' => true])->assertOk()->assertJsonPath('data.is_active', true);
        $this->patchJson('/api/v1/product-categories/'.$category, ['description' => 'Updated'])->assertOk();
        $this->getJson('/api/v1/products?product_category_id='.$category.'&is_active=1')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/product-categories')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_sku_and_category_slug_must_be_unique(): void
    {
        $this->product(['sku' => 'UNIQUE']);
        $this->postJson('/api/v1/products', ['sku' => 'UNIQUE', 'name' => 'Copy', 'type' => 'general', 'unit' => 'piece'])->assertUnprocessable()->assertJsonValidationErrors('sku');
        $this->postJson('/api/v1/product-categories', ['name' => 'Care', 'slug' => 'care'])->assertCreated();
        $this->postJson('/api/v1/product-categories', ['name' => 'Copy', 'slug' => 'care'])->assertUnprocessable()->assertJsonValidationErrors('slug');
    }

    public function test_invalid_catalog_fields_and_direct_stock_input_are_rejected(): void
    {
        $id = $this->product();
        foreach (['minimum_stock' => -1, 'type' => 'other', 'unit' => '', 'product_category_id' => 999, 'stock' => 20, 'price' => 100] as $key => $value) {
            $this->patchJson('/api/v1/products/'.$id, [$key => $value])->assertUnprocessable()->assertJsonValidationErrors($key);
        }
        $this->patchJson('/api/v1/products/'.$id, ['minimum_stock' => 1.5])->assertUnprocessable();
        $this->patchJson('/api/v1/products/'.$id, ['minimum_stock' => true])->assertUnprocessable();
    }

    public function test_guests_customers_and_cashiers_cannot_access_internal_inventory(): void
    {
        $this->getJson('/api/v1/products')->assertUnauthorized();
        foreach (['customer', 'kasir', 'resepsionis', 'groomer', 'hotel'] as $role) {
            $this->actingAs($this->actor($role));
            $this->getJson('/api/v1/products')->assertForbidden();
            $this->postJson('/api/v1/products', [])->assertForbidden();
        }
    }

    public function test_medication_readers_only_see_medicine_and_cannot_write(): void
    {
        $general = $this->product();
        $medicine = $this->product(['type' => 'medicine']);
        $batch = $this->batch($medicine);
        foreach (['pharmacist', 'dokter'] as $role) {
            $this->actingAs($this->actor($role));
            $this->getJson('/api/v1/products')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $medicine);
            $this->getJson('/api/v1/products/'.$general)->assertForbidden();
            $this->getJson('/api/v1/products?type=general')->assertOk()->assertJsonCount(0, 'data');
            $this->getJson('/api/v1/products/'.$medicine)->assertOk();
            $this->getJson('/api/v1/product-batches/'.$batch)->assertOk();
            $this->postJson('/api/v1/products/'.$medicine.'/batches', [])->assertForbidden();
            $this->patchJson('/api/v1/products/'.$medicine, ['name' => 'Spoof'])->assertForbidden();
        }
    }

    public function test_inactive_accounts_are_blocked_and_permission_revocation_is_live(): void
    {
        $actor = $this->actor();
        $this->actingAs($actor)->getJson('/api/v1/products')->assertOk();
        $actor->roles()->detach();
        $this->getJson('/api/v1/products')->assertForbidden();
        $actor = $this->actor();
        $actor->forceFill(['is_active' => false])->save();
        $this->actingAs($actor)->getJson('/api/v1/products')->assertForbidden();
    }

    public function test_medicine_batch_validates_product_number_and_expiry(): void
    {
        $medicine = $this->product(['type' => 'medicine']);
        $batch = $this->batch($medicine, ['batch_number' => 'LOT']);
        $this->postJson('/api/v1/products/'.$medicine.'/batches', ['batch_number' => 'LOT', 'expiry_date' => '2030-01-01'])->assertUnprocessable()->assertJsonValidationErrors('batch_number');
        $this->postJson('/api/v1/products/'.$medicine.'/batches', ['batch_number' => 'OTHER'])->assertUnprocessable()->assertJsonValidationErrors('expiry_date');
        $this->postJson('/api/v1/products/'.$medicine.'/batches', ['batch_number' => 'OTHER', 'expiry_date' => '2027-02-30'])->assertUnprocessable();
        $this->getJson('/api/v1/products/'.$medicine.'/batches')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/product-batches/'.$batch)->assertOk()->assertJsonPath('data.product_id', $medicine);
        $general = $this->product();
        $this->postJson('/api/v1/products/'.$general.'/batches', ['batch_number' => 'NO', 'expiry_date' => '2030-01-01'])->assertUnprocessable();
    }

    public function test_batch_number_is_unique_per_product_not_globally(): void
    {
        $this->batch($this->product(['type' => 'medicine']), ['batch_number' => 'SHARED']);
        $this->batch($this->product(['type' => 'medicine']), ['batch_number' => 'SHARED']);
        $this->assertDatabaseCount('product_batches', 2);
    }

    public function test_batch_history_prevents_product_type_or_unit_changes(): void
    {
        $medicine = $this->product(['type' => 'medicine']);
        $this->batch($medicine);
        $this->patchJson('/api/v1/products/'.$medicine, ['type' => 'general'])->assertUnprocessable();
        $this->patchJson('/api/v1/products/'.$medicine, ['unit' => 'bottle'])->assertUnprocessable();
        $this->patchJson('/api/v1/products/'.$medicine, ['name' => 'Allowed rename'])->assertOk();
        $this->deleteJson('/api/v1/products/'.$medicine)->assertMethodNotAllowed();
    }

    public function test_catalog_and_stock_management_permissions_are_separate(): void
    {
        $actor = User::factory()->create();
        $role = Role::create(['name' => 'Catalog', 'slug' => 'catalog-only']);
        $role->permissions()->attach(DB::table('permissions')->where('slug', 'manage_products')->value('id'));
        $actor->roles()->attach($role);
        $this->actingAs($actor)->postJson('/api/v1/products', ['sku' => 'CAT', 'name' => 'Catalog', 'type' => 'medicine', 'unit' => 'piece'])->assertCreated();
        $this->postJson('/api/v1/products/1/batches', [])->assertForbidden();
    }

    private function move(int $product, string $type = 'opening_stock', int $quantity = 10, ?int $batch = null): TestResponse
    {
        return $this->postJson('/api/v1/stock-movements', ['product_id' => $product, 'product_batch_id' => $batch,
            'movement_type' => $type, 'quantity' => $quantity, 'reason' => 'Verified count']);
    }

    public function test_opening_and_adjustments_are_ledger_entries_with_server_actor_and_direction(): void
    {
        $product = $this->product();
        $actor = $this->actor();
        $this->actingAs($actor);
        $this->move($product)->assertCreated()->assertJsonPath('data.direction', 'in')->assertJsonPath('data.performed_by', $actor->id);
        $this->move($product, 'adjustment_out', 3)->assertCreated()->assertJsonPath('data.direction', 'out');
        $this->move($product, 'adjustment_in', 2)->assertCreated();
        $this->assertDatabaseCount('stock_movements', 3);
        $this->assertSame(9, (int) DB::table('stock_movements')->selectRaw("SUM(CASE WHEN direction = 'in' THEN quantity ELSE -quantity END) AS balance")->value('balance'));
    }

    public function test_outflow_cannot_create_negative_balance_and_failure_is_atomic(): void
    {
        $product = $this->product();
        $this->move($product)->assertCreated();
        $this->move($product, 'adjustment_out', 11)->assertUnprocessable()->assertJsonValidationErrors('quantity');
        $this->assertDatabaseCount('stock_movements', 1);
        $this->move($product, 'adjustment_out', 10)->assertCreated();
        $this->move($product, 'adjustment_out', 1)->assertUnprocessable();
        $this->assertDatabaseCount('stock_movements', 2);
    }

    public function test_opening_is_once_per_bucket_and_must_precede_other_movements(): void
    {
        $product = $this->product();
        $this->move($product)->assertCreated();
        $this->move($product)->assertUnprocessable();
        $other = $this->product();
        $this->move($other, 'adjustment_in')->assertCreated();
        $this->move($other)->assertUnprocessable();
        $medicine = $this->product(['type' => 'medicine']);
        $first = $this->batch($medicine);
        $second = $this->batch($medicine);
        $this->move($medicine, batch: $first)->assertCreated();
        $this->move($medicine, batch: $second)->assertCreated();
        $this->move($medicine, batch: $first)->assertUnprocessable();
    }

    public function test_medicine_requires_own_batch_and_general_uses_null_batch(): void
    {
        $medicine = $this->product(['type' => 'medicine']);
        $batch = $this->batch($medicine);
        $other = $this->product(['type' => 'medicine']);
        $this->move($medicine)->assertUnprocessable()->assertJsonValidationErrors('product_batch_id');
        $this->move($other, batch: $batch)->assertUnprocessable();
        $general = $this->product();
        $this->move($general, batch: $batch)->assertUnprocessable();
        $this->move($general)->assertCreated();
        $this->move($medicine, batch: $batch)->assertCreated();
    }

    public function test_outflow_checks_batch_balance_not_product_total(): void
    {
        $medicine = $this->product(['type' => 'medicine']);
        $first = $this->batch($medicine);
        $second = $this->batch($medicine);
        $this->move($medicine, quantity: 2, batch: $first)->assertCreated();
        $this->move($medicine, quantity: 20, batch: $second)->assertCreated();
        $this->move($medicine, 'adjustment_out', 3, $first)->assertUnprocessable();
    }

    public function test_expired_stock_is_preserved_but_cannot_be_adjusted_out(): void
    {
        $medicine = $this->product(['type' => 'medicine']);
        $batch = $this->batch($medicine, ['expiry_date' => now()->subDay()->toDateString()]);
        $this->move($medicine, batch: $batch)->assertCreated();
        $this->move($medicine, 'adjustment_out', 1, $batch)->assertUnprocessable()->assertJsonValidationErrors('product_batch_id');
        $this->assertDatabaseCount('stock_movements', 1);
    }

    public function test_expiry_day_is_usable_until_next_utc_date(): void
    {
        $medicine = $this->product(['type' => 'medicine']);
        $batch = $this->batch($medicine, ['expiry_date' => now()->toDateString()]);
        $this->move($medicine, batch: $batch)->assertCreated();
        $this->move($medicine, 'adjustment_out', 1, $batch)->assertCreated();
        $this->travelTo(now()->addDay());
        $this->move($medicine, 'adjustment_out', 1, $batch)->assertUnprocessable();
    }

    public function test_quantities_are_positive_integers_and_adjustments_require_reason(): void
    {
        $product = $this->product();
        $base = ['product_id' => $product, 'movement_type' => 'adjustment_in', 'reason' => 'Count'];
        foreach ([0, -1, 1.5, '1.001', 2147483648, 'one', true, false, []] as $quantity) {
            $this->postJson('/api/v1/stock-movements', $base + ['quantity' => $quantity])->assertUnprocessable()->assertJsonValidationErrors('quantity');
        }
        foreach ([null, '', '   '] as $reason) {
            $this->postJson('/api/v1/stock-movements', ['product_id' => $product, 'movement_type' => 'adjustment_out', 'quantity' => 1, 'reason' => $reason])->assertUnprocessable()->assertJsonValidationErrors('reason');
        }
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_client_cannot_spoof_actor_direction_reference_or_future_types(): void
    {
        $product = $this->product();
        $base = ['product_id' => $product, 'movement_type' => 'adjustment_in', 'quantity' => 1, 'reason' => 'Count'];
        foreach (['performed_by' => 99, 'direction' => 'out', 'reference_id' => 1, 'reference_type' => 'sale', 'created_at' => '2020-01-01', 'id' => 1] as $field => $value) {
            $this->postJson('/api/v1/stock-movements', $base + [$field => $value])->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        foreach (['purchase_receipt', 'sale', 'medicine_dispensing'] as $type) {
            $this->postJson('/api/v1/stock-movements', array_replace($base, ['movement_type' => $type]))->assertUnprocessable();
        }
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_inactive_products_reject_batch_and_movement_writes_but_keep_history(): void
    {
        $product = $this->product(['type' => 'medicine']);
        $batch = $this->batch($product);
        $this->move($product, batch: $batch)->assertCreated();
        $this->patchJson('/api/v1/products/'.$product, ['is_active' => false])->assertOk();
        $this->move($product, 'adjustment_in', 1, $batch)->assertUnprocessable();
        $this->postJson('/api/v1/products/'.$product.'/batches', ['batch_number' => 'NEW', 'expiry_date' => '2030-01-01'])->assertUnprocessable();
        $this->getJson('/api/v1/products/'.$product)->assertOk();
        $this->assertDatabaseCount('stock_movements', 1);
    }

    public function test_general_product_unit_and_type_are_frozen_after_movement(): void
    {
        $product = $this->product();
        $this->move($product)->assertCreated();
        $this->patchJson('/api/v1/products/'.$product, ['unit' => 'box'])->assertUnprocessable();
        $this->patchJson('/api/v1/products/'.$product, ['type' => 'medicine'])->assertUnprocessable();
    }

    public function test_stock_movements_have_no_update_or_delete_api(): void
    {
        $product = $this->product();
        $id = $this->move($product)->assertCreated()->json('data.id');
        $this->patchJson('/api/v1/stock-movements/'.$id, ['quantity' => 999])->assertNotFound();
        $this->deleteJson('/api/v1/stock-movements/'.$id)->assertNotFound();
        $this->assertDatabaseHas('stock_movements', ['id' => $id, 'quantity' => 10]);
    }

    public function test_eloquent_cannot_rewrite_ledger_history(): void
    {
        $product = $this->product();
        $id = $this->move($product)->assertCreated()->json('data.id');
        $movement = StockMovement::findOrFail($id);
        $this->expectException(\LogicException::class);
        $movement->forceFill(['quantity' => 999])->save();
    }

    public function test_eloquent_cannot_delete_ledger_history(): void
    {
        $product = $this->product();
        $id = $this->move($product)->assertCreated()->json('data.id');
        $this->expectException(\LogicException::class);
        StockMovement::findOrFail($id)->delete();
    }

    public function test_only_inventory_managers_can_write_movements(): void
    {
        $product = $this->product(['type' => 'medicine']);
        $batch = $this->batch($product);
        foreach (['pharmacist', 'dokter', 'customer', 'kasir', 'resepsionis'] as $role) {
            $this->actingAs($this->actor($role));
            $this->move($product, batch: $batch)->assertForbidden();
        }
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_domain_writer_revalidates_and_authorizes_internal_calls(): void
    {
        $product = $this->product();
        $service = app(InventoryService::class);
        try {
            $service->record($this->actor('customer'), ['product_id' => $product]);
            $this->fail('Unauthorized writer accepted.');
        } catch (AuthorizationException) {
            $this->assertDatabaseCount('stock_movements', 0);
        }
        $this->expectException(ValidationException::class);
        $service->record($this->actor(), ['product_id' => $product, 'movement_type' => 'adjustment_in', 'quantity' => -1]);
    }

    public function test_monitoring_distinguishes_physical_usable_expired_and_low_stock(): void
    {
        $medicine = $this->product(['type' => 'medicine', 'minimum_stock' => 6]);
        $expired = $this->batch($medicine, ['expiry_date' => now()->subDay()->toDateString()]);
        $valid = $this->batch($medicine);
        $this->move($medicine, quantity: 20, batch: $expired)->assertCreated();
        $this->move($medicine, quantity: 5, batch: $valid)->assertCreated();
        $this->getJson('/api/v1/inventory/balances?product_id='.$medicine)->assertOk()->assertJsonPath('data.0.physical_stock', 25)
            ->assertJsonPath('data.0.expired_stock', 20)->assertJsonPath('data.0.usable_stock', 5);
        $this->getJson('/api/v1/inventory/low-stock')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $medicine);
        $this->getJson('/api/v1/inventory/expired-batches')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $expired)->assertJsonPath('data.0.physical_stock', 20)->assertJsonPath('data.0.usable_stock', 0);
        $this->getJson('/api/v1/product-batches/'.$valid)->assertOk()->assertJsonPath('data.physical_stock', 5);
    }

    public function test_inactive_product_stock_remains_physical_but_not_usable(): void
    {
        $product = $this->product();
        $this->move($product)->assertCreated();
        $this->patchJson('/api/v1/products/'.$product, ['is_active' => false])->assertOk();
        $this->getJson('/api/v1/inventory/balances')->assertOk()->assertJsonPath('data.0.physical_stock', 10)->assertJsonPath('data.0.usable_stock', 0);
    }

    public function test_zero_balance_and_low_stock_threshold_are_exact(): void
    {
        $empty = $this->product(['minimum_stock' => 0]);
        $threshold = $this->product(['minimum_stock' => 5]);
        $this->move($threshold, quantity: 5)->assertCreated();
        $this->getJson('/api/v1/inventory/balances?product_id='.$empty)->assertOk()->assertJsonPath('data.0.physical_stock', 0);
        $this->getJson('/api/v1/inventory/low-stock')->assertOk()->assertJsonCount(0, 'data');
        $this->move($threshold, 'adjustment_out', 1)->assertCreated();
        $this->getJson('/api/v1/inventory/low-stock')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_batch_listing_supports_fefo_usable_candidates_without_dispensing(): void
    {
        $product = $this->product(['type' => 'medicine']);
        $later = $this->batch($product, ['expiry_date' => now()->addMonths(2)->toDateString()]);
        $earlier = $this->batch($product, ['expiry_date' => now()->addMonth()->toDateString()]);
        $expired = $this->batch($product, ['expiry_date' => now()->subDay()->toDateString()]);
        $this->batch($product, ['expiry_date' => now()->addDays(3)->toDateString()]);
        foreach ([$later, $earlier, $expired] as $batch) {
            $this->move($product, batch: $batch)->assertCreated();
        }
        $this->getJson('/api/v1/products/'.$product.'/batches?usable_only=1')->assertOk()->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.id', $earlier)->assertJsonPath('data.1.id', $later);
        $this->assertDatabaseCount('stock_movements', 3);
    }

    public function test_movement_history_filters_dates_types_products_and_pagination(): void
    {
        $first = $this->product();
        $second = $this->product();
        $this->move($first)->assertCreated();
        $this->move($second)->assertCreated();
        $this->travelTo(now()->addDay());
        $this->move($first, 'adjustment_in')->assertCreated();
        $today = now()->toDateString();
        $this->getJson('/api/v1/stock-movements?product_id='.$first.'&movement_type=adjustment_in&from='.$today.'&to='.$today)
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.movement_type', 'adjustment_in');
        $this->getJson('/api/v1/stock-movements?per_page=1&page=2')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.total', 3);
        $this->getJson('/api/v1/stock-movements?from=2030-02-02&to=2030-01-01')->assertUnprocessable();
        $this->getJson('/api/v1/stock-movements?movement_type=anything')->assertUnprocessable();
        $this->getJson('/api/v1/inventory/balances?per_page=101')->assertUnprocessable();
        $this->getJson('/api/v1/inventory/expired-batches?per_page=0')->assertUnprocessable();
    }

    public function test_medicine_read_scope_applies_to_every_stock_query_and_hides_audit_history(): void
    {
        $general = $this->product();
        $medicine = $this->product(['type' => 'medicine']);
        $batch = $this->batch($medicine, ['expiry_date' => now()->subDay()->toDateString()]);
        $this->move($general)->assertCreated();
        $this->move($medicine, batch: $batch)->assertCreated();
        foreach (['pharmacist', 'dokter'] as $role) {
            $this->actingAs($this->actor($role));
            $this->getJson('/api/v1/inventory/balances')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $medicine);
            $this->getJson('/api/v1/inventory/balances?product_id='.$general)->assertOk()->assertJsonCount(0, 'data');
            $this->getJson('/api/v1/inventory/low-stock?product_id='.$general)->assertOk()->assertJsonCount(0, 'data');
            $this->getJson('/api/v1/inventory/expired-batches')->assertOk()->assertJsonCount(1, 'data');
            $this->getJson('/api/v1/stock-movements')->assertForbidden();
        }
    }

    public function test_customers_cannot_access_any_inventory_monitoring_endpoint(): void
    {
        $this->actingAs($this->actor('customer'));
        foreach (['inventory/balances', 'inventory/low-stock', 'inventory/expired-batches', 'stock-movements'] as $path) {
            $this->getJson('/api/v1/'.$path)->assertForbidden();
        }
    }

    public function test_inventory_schema_restricts_historical_parent_deletion(): void
    {
        $product = $this->product();
        $this->move($product)->assertCreated();
        $this->expectException(QueryException::class);
        DB::table('products')->where('id', $product)->delete();
    }

    public function test_batch_unique_constraint_applies_beyond_http_validation(): void
    {
        $product = $this->product(['type' => 'medicine']);
        $this->batch($product, ['batch_number' => 'DATABASE']);
        $this->expectException(QueryException::class);
        DB::table('product_batches')->insert(['product_id' => $product, 'batch_number' => 'DATABASE', 'expiry_date' => '2030-01-01']);
    }

    public function test_existing_seeders_are_idempotent_and_do_not_seed_inventory_or_restore_revoked_grants(): void
    {
        $this->seed(DatabaseSeeder::class);
        $role = Role::where('slug', 'inventory')->firstOrFail();
        $permission = DB::table('permissions')->where('slug', 'manage_inventory')->value('id');
        $role->permissions()->detach($permission);
        $counts = [DB::table('roles')->count(), DB::table('permissions')->count(), DB::table('role_permissions')->count()];
        $this->seed(DatabaseSeeder::class);
        $this->assertSame($counts, [DB::table('roles')->count(), DB::table('permissions')->count(), DB::table('role_permissions')->count()]);
        $this->assertFalse($role->permissions()->where('permissions.id', $permission)->exists());
        foreach (['products', 'product_batches', 'stock_movements', 'product_categories'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
    }

    public function test_movement_date_filters_allow_each_bound_independently(): void
    {
        $product = $this->product();
        $this->move($product)->assertCreated();
        $date = now()->toDateString();
        $this->getJson('/api/v1/stock-movements?to='.$date)->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/stock-movements?from='.$date)->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_database_rejects_batch_product_mismatch_in_ledger(): void
    {
        $first = $this->product(['type' => 'medicine']);
        $batch = $this->batch($first);
        $other = $this->product(['type' => 'medicine']);
        $this->expectException(QueryException::class);
        DB::table('stock_movements')->insert(['product_id' => $other, 'product_batch_id' => $batch, 'quantity' => 1,
            'direction' => 'in', 'movement_type' => 'opening_stock', 'reason' => 'Mismatch', 'performed_by' => $this->actor()->id, 'created_at' => now()]);
    }

    public function test_balance_limit_rejects_overflow_atomically(): void
    {
        $product = $this->product();
        $this->move($product, quantity: 2147483647)->assertCreated();
        $this->move($product, 'adjustment_in', 1)->assertUnprocessable();
        $this->assertDatabaseCount('stock_movements', 1);
        $this->getJson('/api/v1/inventory/balances')->assertOk()->assertJsonPath('data.0.physical_stock', 2147483647);
    }

    public function test_stock_only_permission_cannot_change_catalog_and_catalog_only_cannot_read_audit(): void
    {
        $product = $this->product();
        $role = Role::create(['name' => 'Stock only', 'slug' => 'stock-only']);
        $role->permissions()->attach(DB::table('permissions')->where('slug', 'manage_inventory')->value('id'));
        $user = User::factory()->create();
        $user->roles()->attach($role);
        $this->actingAs($user)->patchJson('/api/v1/products/'.$product, ['name' => 'Spoof'])->assertForbidden();
        $this->move($product)->assertCreated();
        $role->permissions()->sync([DB::table('permissions')->where('slug', 'manage_products')->value('id')]);
        $this->getJson('/api/v1/inventory/balances')->assertForbidden();
        $this->getJson('/api/v1/stock-movements')->assertForbidden();
    }

    public function test_combined_catalog_and_medicine_read_does_not_expand_stock_scope(): void
    {
        $general = $this->product();
        $medicine = $this->product(['type' => 'medicine']);
        $role = Role::create(['name' => 'Catalog reader', 'slug' => 'catalog-medication']);
        $role->permissions()->attach(DB::table('permissions')->whereIn('slug', ['manage_products', 'view_medication_stock'])->pluck('id'));
        $actor = User::factory()->create();
        $actor->roles()->attach($role);
        $this->actingAs($actor)->getJson('/api/v1/products')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/inventory/balances')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $medicine);
        $this->getJson('/api/v1/inventory/balances?product_id='.$general)->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/stock-movements')->assertForbidden();
    }

    public function test_batch_service_rereads_stale_product_activity(): void
    {
        $id = $this->product(['type' => 'medicine']);
        $stale = Product::findOrFail($id);
        $this->patchJson('/api/v1/products/'.$id, ['is_active' => false])->assertOk();
        $this->expectException(ValidationException::class);
        app(InventoryCatalogService::class)->createBatch($this->actor(), $stale, ['batch_number' => 'STALE', 'expiry_date' => '2030-01-01']);
    }

    public function test_multiple_batch_movements_have_exact_filtered_paginated_aggregates(): void
    {
        $medicine = $this->product(['type' => 'medicine']);
        $first = $this->batch($medicine);
        $second = $this->batch($medicine);
        $this->move($medicine, quantity: 20, batch: $first)->assertCreated();
        $this->move($medicine, 'adjustment_out', 7, $first)->assertCreated();
        $this->move($medicine, 'adjustment_in', 2, $first)->assertCreated();
        $this->move($medicine, quantity: 9, batch: $second)->assertCreated();
        $this->move($medicine, 'adjustment_out', 4, $second)->assertCreated();
        $other = $this->product();
        $this->move($other, quantity: 999)->assertCreated();
        $this->getJson('/api/v1/inventory/balances?product_id='.$medicine.'&per_page=1')->assertOk()->assertJsonPath('data.0.physical_stock', 20)->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/products/'.$medicine.'/batches?per_page=1&page=2')->assertOk()->assertJsonPath('data.0.physical_stock', 5)->assertJsonPath('meta.total', 2);
        $this->getJson('/api/v1/stock-movements?product_batch_id='.$first.'&per_page=2')->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta.total', 3);
    }

    public function test_batch_with_movement_cannot_be_physically_deleted(): void
    {
        $medicine = $this->product(['type' => 'medicine']);
        $batch = $this->batch($medicine);
        $this->move($medicine, batch: $batch)->assertCreated();
        $this->expectException(QueryException::class);
        DB::table('product_batches')->where('id', $batch)->delete();
    }

    public function test_audit_actor_cannot_be_deleted_while_ledger_references_it(): void
    {
        $product = $this->product();
        $actor = $this->actor();
        $this->actingAs($actor);
        $this->move($product)->assertCreated();
        $this->expectException(QueryException::class);
        DB::table('users')->where('id', $actor->id)->delete();
    }
}
