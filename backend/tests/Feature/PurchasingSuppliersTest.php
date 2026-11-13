<?php

namespace Tests\Feature;

use App\Models\GoodsReceiving;
use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Role;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\GoodsReceivingService;
use Database\Seeders\PurchasingSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\InMemoryDatabaseTestCase;

class PurchasingSuppliersTest extends InMemoryDatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PurchasingSeeder::class);
        $this->actingAs($this->actor());
    }

    private function actor(string $role = 'inventory'): User
    {
        $u = User::factory()->create();
        $u->roles()->attach(Role::where('slug', $role)->firstOrFail());

        return $u;
    }

    private function supplier(): int
    {
        return $this->postJson('/api/v1/suppliers', ['name' => 'Trusted', 'email' => 's@example.test'])->assertCreated()->json('data.id');
    }

    private function product(string $type = 'general'): Product
    {
        return Product::create(['sku' => (string) Str::uuid(), 'name' => 'Product', 'unit' => 'piece', 'type' => $type]);
    }

    private function po(?array $items = null): int
    {
        $p = $this->product();

        return $this->postJson('/api/v1/purchase-orders', ['supplier_id' => $this->supplier(), 'order_date' => now()->toDateString(), 'items' => $items ?? [['product_id' => $p->id, 'quantity_ordered' => 10, 'unit_purchase_price' => '12.35']]])->assertCreated()->json('data.id');
    }

    private function order(int $id): void
    {
        $this->patchJson('/api/v1/purchase-orders/'.$id.'/status', ['status' => 'ordered'])->assertOk();
    }

    private function receipt(int $po, int $quantity = 3, array $extra = []): array
    {
        return array_merge(['idempotency_key' => (string) Str::uuid(), 'received_date' => now()->toDateString(), 'items' => [['purchase_order_item_id' => DB::table('purchase_order_items')->where('purchase_order_id', $po)->value('id'), 'quantity' => $quantity]]], $extra);
    }

    public function test_supplier_create_search_update_deactivation(): void
    {
        $id = $this->supplier();
        $this->patchJson('/api/v1/suppliers/'.$id, ['phone' => '123', 'is_active' => false])->assertOk()->assertJsonPath('data.is_active', false);
        $this->getJson('/api/v1/suppliers?search=Trust&is_active=0')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/suppliers/'.$id)->assertOk();
        $this->deleteJson('/api/v1/suppliers/'.$id)->assertMethodNotAllowed();
        $this->postJson('/api/v1/purchase-orders', ['supplier_id' => $id, 'order_date' => now()->toDateString(), 'items' => []])->assertUnprocessable();
    }

    public function test_po_snapshot_totals_edit_draft_order_lock_and_cancel(): void
    {
        $id = $this->po();
        $this->getJson('/api/v1/purchase-orders/'.$id)->assertOk()->assertJsonPath('data.total', '123.50');
        $this->patchJson('/api/v1/purchase-orders/'.$id, ['notes' => 'Editable'])->assertOk();
        $this->order($id);
        $this->patchJson('/api/v1/purchase-orders/'.$id, ['notes' => 'Denied'])->assertUnprocessable();
        $this->patchJson('/api/v1/purchase-orders/'.$id.'/status', ['status' => 'cancelled'])->assertOk();
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id))->assertUnprocessable();
    }

    public function test_empty_draft_cannot_be_ordered_and_internal_fields_are_rejected(): void
    {
        $id = $this->po([]);
        $this->patchJson('/api/v1/purchase-orders/'.$id.'/status', ['status' => 'ordered'])->assertUnprocessable();
        foreach (['status' => 'fully_received', 'total' => '1.00', 'created_by' => 99, 'po_number' => 'SPOOF'] as $k => $v) {
            $this->patchJson('/api/v1/purchase-orders/'.$id, [$k => $v])->assertUnprocessable();
        }
    }

    public function test_partial_multiple_and_full_receiving_updates_shared_ledger(): void
    {
        $id = $this->po();
        $this->order($id);
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id, 3))->assertCreated()->assertJsonPath('data.items.0.quantity', 3);
        $this->getJson('/api/v1/purchase-orders/'.$id)->assertJsonPath('data.status', 'partially_received')->assertJsonPath('data.items.0.quantity_received', 3)->assertJsonPath('data.items.0.remaining_quantity', 7);
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id, 7))->assertCreated();
        $this->getJson('/api/v1/purchase-orders/'.$id)->assertJsonPath('data.status', 'fully_received');
        $this->getJson('/api/v1/inventory/balances')->assertJsonPath('data.0.physical_stock', 10);
        $this->assertDatabaseCount('stock_movements', 2);
        $this->assertDatabaseHas('stock_movements', ['movement_type' => 'purchase_receipt', 'direction' => 'in']);
        $this->getJson('/api/v1/purchase-orders/'.$id.'/receivings')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_duplicate_receipt_retry_is_safe_and_changed_payload_is_rejected(): void
    {
        $id = $this->po();
        $this->order($id);
        $payload = $this->receipt($id, 10);
        $rid = $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertCreated()->json('data.id');
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertOk()->assertJsonPath('data.id', $rid);
        $payload['items'][0]['quantity'] = 1;
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertUnprocessable();
        $this->assertDatabaseCount('stock_movements', 1);
    }

    public function test_over_receiving_and_cancellation_after_receipt_rejected(): void
    {
        $id = $this->po();
        $this->order($id);
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id, 11))->assertUnprocessable();
        $this->assertDatabaseCount('goods_receivings', 0);
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id, 1))->assertCreated();
        $this->patchJson('/api/v1/purchase-orders/'.$id.'/status', ['status' => 'cancelled'])->assertUnprocessable();
    }

    public function test_medicine_requires_batch_and_expiry_and_can_split_batches(): void
    {
        $p = $this->product('medicine');
        $id = $this->po([['product_id' => $p->id, 'quantity_ordered' => 10, 'unit_purchase_price' => '2.00']]);
        $this->order($id);
        $payload = $this->receipt($id);
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertUnprocessable();
        $item = $payload['items'][0];
        $item['batch_number'] = 'LOT1';
        $payload['items'] = [$item];
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertUnprocessable();
        $item['expiry_date'] = now()->addYear()->toDateString();
        $second = $item;
        $second['batch_number'] = 'LOT2';
        $second['quantity'] = 7;
        $payload['items'] = [$item, $second];
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertCreated();
        $this->assertDatabaseCount('product_batches', 2);
        $this->assertDatabaseCount('stock_movements', 2);
    }

    public function test_expired_medicine_and_batch_expiry_mismatch_rejected(): void
    {
        $p = $this->product('medicine');
        $id = $this->po([['product_id' => $p->id, 'quantity_ordered' => 10, 'unit_purchase_price' => '2.00']]);
        $this->order($id);
        $payload = $this->receipt($id);
        $payload['items'][0] += ['batch_number' => 'LOT', 'expiry_date' => now()->subDay()->toDateString()];
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertUnprocessable();
        $payload['items'][0]['expiry_date'] = now()->addYear()->toDateString();
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertCreated();
        $payload['idempotency_key'] = (string) Str::uuid();
        $payload['items'][0]['expiry_date'] = now()->addYears(2)->toDateString();
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertUnprocessable();
        $this->assertDatabaseCount('stock_movements', 1);
    }

    public function test_supplier_deactivation_does_not_block_existing_ordered_receipt(): void
    {
        $id = $this->po();
        $this->order($id);
        $sid = DB::table('purchase_orders')->where('id', $id)->value('supplier_id');
        $this->patchJson('/api/v1/suppliers/'.$sid, ['is_active' => false])->assertOk();
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id))->assertCreated();
    }

    public function test_inactive_product_rejects_receiving_atomically(): void
    {
        $id = $this->po();
        $this->order($id);
        $pid = DB::table('purchase_order_items')->where('purchase_order_id', $id)->value('product_id');
        Product::find($pid)->update(['is_active' => false]);
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id))->assertUnprocessable();
        $this->assertDatabaseCount('goods_receivings', 0);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_actual_price_is_separate_from_po_snapshot(): void
    {
        $id = $this->po();
        $this->order($id);
        $payload = $this->receipt($id);
        $payload['items'][0]['actual_unit_price'] = '13.50';
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertCreated()->assertJsonPath('data.items.0.actual_unit_price', '13.50');
        $this->getJson('/api/v1/purchase-orders/'.$id)->assertJsonPath('data.items.0.unit_purchase_price', '12.35')->assertJsonPath('data.total', '123.50');
    }

    public function test_foreign_po_item_and_general_batch_payload_are_rejected(): void
    {
        $id = $this->po();
        $other = $this->po();
        $this->order($id);
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($other))->assertUnprocessable();
        $payload = $this->receipt($id);
        $payload['items'][0]['batch_number'] = 'FORBIDDEN';
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertUnprocessable();
    }

    public function test_unprivileged_roles_cannot_access_purchasing(): void
    {
        foreach (['customer', 'pharmacist', 'dokter', 'kasir', 'resepsionis', 'groomer', 'hotel'] as $role) {
            $this->actingAs($this->actor($role));
            foreach (['suppliers', 'purchase-orders'] as $path) {
                $this->getJson('/api/v1/'.$path)->assertForbidden();
                $this->postJson('/api/v1/'.$path, [])->assertForbidden();
            }
        }
    }

    public function test_validation_rejects_bad_quantities_prices_dates_and_duplicates(): void
    {
        $id = $this->po();
        $p = $this->product();
        foreach ([0, -1, 1.5, true] as $q) {
            $this->patchJson('/api/v1/purchase-orders/'.$id, ['items' => [['product_id' => $p->id, 'quantity_ordered' => $q, 'unit_purchase_price' => '1.00']]])->assertUnprocessable();
        }
        foreach (['-1', '1.001', '99999999999999999'] as $price) {
            $this->patchJson('/api/v1/purchase-orders/'.$id, ['items' => [['product_id' => $p->id, 'quantity_ordered' => 1, 'unit_purchase_price' => $price]]])->assertUnprocessable();
        }
        $this->patchJson('/api/v1/purchase-orders/'.$id, ['expected_delivery_date' => '2027-02-30'])->assertUnprocessable();
        $item = ['product_id' => $p->id, 'quantity_ordered' => 1, 'unit_purchase_price' => '1.00'];
        $this->patchJson('/api/v1/purchase-orders/'.$id, ['items' => [$item, $item]])->assertUnprocessable();
    }

    public function test_failure_after_ledger_write_rolls_back_entire_receipt(): void
    {
        $id = $this->po();
        $this->order($id);
        PurchaseOrder::updating(function ($po) {
            if ($po->status === 'partially_received') {
                throw new \RuntimeException('Injected status persistence failure');
            }
        });
        try {
            app(GoodsReceivingService::class)->confirm(auth()->user(), PurchaseOrder::find($id), $this->receipt($id));
            $this->fail('Failure expected');
        } catch (\RuntimeException $e) {
            $this->assertSame('Injected status persistence failure', $e->getMessage());
        }
        $this->assertDatabaseCount('goods_receivings', 0);
        $this->assertDatabaseCount('goods_receiving_items', 0);
        $this->assertDatabaseCount('stock_movements', 0);
        $this->assertDatabaseHas('purchase_orders', ['id' => $id, 'status' => 'ordered']);
    }

    public function test_second_stock_movement_failure_rolls_back_first_line_and_new_batches(): void
    {
        $first = $this->product('medicine');
        $second = $this->product('medicine');
        $id = $this->po([['product_id' => $first->id, 'quantity_ordered' => 1, 'unit_purchase_price' => '1.00'], ['product_id' => $second->id, 'quantity_ordered' => 1, 'unit_purchase_price' => '1.00']]);
        $this->order($id);
        $items = DB::table('purchase_order_items')->where('purchase_order_id', $id)->orderBy('id')->get();
        $payload = $this->receipt($id, 1);
        $payload['items'] = [];
        foreach ($items as $item) {
            $payload['items'][] = ['purchase_order_item_id' => $item->id, 'quantity' => 1, 'batch_number' => 'NEW', 'expiry_date' => now()->addYear()->toDateString()];
        }
        $count = 0;
        StockMovement::creating(function () use (&$count) {
            if (++$count === 2) {
                throw new \RuntimeException('Injected second movement failure');
            }
        });
        try {
            app(GoodsReceivingService::class)->confirm(auth()->user(), PurchaseOrder::find($id), $payload);
            $this->fail('Failure expected');
        } catch (\RuntimeException $e) {
            $this->assertSame('Injected second movement failure', $e->getMessage());
        }
        foreach (['goods_receivings', 'goods_receiving_items', 'stock_movements', 'product_batches'] as $table) {
            $this->assertDatabaseCount($table, 0);
        }
    }

    public function test_receipt_model_and_api_do_not_allow_history_changes(): void
    {
        $id = $this->po();
        $this->order($id);
        $rid = $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id))->assertCreated()->json('data.id');
        $this->getJson('/api/v1/goods-receivings/'.$rid)->assertOk();
        $this->patchJson('/api/v1/goods-receivings/'.$rid, ['notes' => 'edit'])->assertMethodNotAllowed();
        $this->deleteJson('/api/v1/goods-receivings/'.$rid)->assertMethodNotAllowed();
        $this->expectException(\LogicException::class);
        GoodsReceiving::find($rid)->forceFill(['notes' => 'edit'])->save();
    }

    public function test_receive_permission_does_not_require_general_inventory_adjustment_permission(): void
    {
        $id = $this->po();
        $this->order($id);
        $role = Role::create(['slug' => 'receiver-only', 'name' => 'Receiver only']);
        $role->permissions()->attach(DB::table('permissions')->where('slug', 'receive_purchase_orders')->value('id'));
        $user = User::factory()->create();
        $user->roles()->attach($role);
        $this->actingAs($user);
        $this->getJson('/api/v1/purchase-orders/'.$id)->assertOk();
        $this->patchJson('/api/v1/purchase-orders/'.$id.'/status', ['status' => 'cancelled'])->assertForbidden();
        $this->postJson('/api/v1/stock-movements', [])->assertForbidden();
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id))->assertCreated();
    }

    public function test_manage_po_permission_does_not_implicitly_grant_receiving(): void
    {
        $id = $this->po();
        $this->order($id);
        $role = Role::create(['slug' => 'po-only', 'name' => 'PO only']);
        $role->permissions()->attach(DB::table('permissions')->where('slug', 'manage_purchase_orders')->value('id'));
        $user = User::factory()->create();
        $user->roles()->attach($role);
        $this->actingAs($user);
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id))->assertForbidden();
    }

    public function test_repeated_product_rows_cannot_bypass_remaining_limit(): void
    {
        $id = $this->po();
        $this->order($id);
        $payload = $this->receipt($id, 6);
        $payload['items'][] = $payload['items'][0];
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertUnprocessable();
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_same_batch_can_be_received_again_without_changing_expiry(): void
    {
        $product = $this->product('medicine');
        $id = $this->po([['product_id' => $product->id, 'quantity_ordered' => 10, 'unit_purchase_price' => '2.00']]);
        $this->order($id);
        $payload = $this->receipt($id, 3);
        $payload['items'][0] += ['batch_number' => 'SAME', 'expiry_date' => now()->addYear()->toDateString()];
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertCreated();
        $payload['idempotency_key'] = (string) Str::uuid();
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertCreated();
        $this->assertDatabaseCount('product_batches', 1);
        $this->getJson('/api/v1/inventory/balances')->assertJsonPath('data.0.physical_stock', 6);
    }

    public function test_receiving_before_ordering_and_public_purchase_receipt_spoof_are_rejected(): void
    {
        $id = $this->po();
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id))->assertUnprocessable();
        $this->postJson('/api/v1/stock-movements', ['product_id' => $this->product()->id, 'quantity' => 1, 'reason' => 'Spoof', 'movement_type' => 'purchase_receipt'])->assertUnprocessable();
    }

    public function test_pricing_uses_exact_cents_and_rejects_total_overflow(): void
    {
        $p = $this->product();
        $id = $this->po([['product_id' => $p->id, 'quantity_ordered' => 3, 'unit_purchase_price' => '0.10']]);
        $this->getJson('/api/v1/purchase-orders/'.$id)->assertJsonPath('data.total', '0.30');
        $this->patchJson('/api/v1/purchase-orders/'.$id, ['items' => [['product_id' => $p->id, 'quantity_ordered' => 2147483647, 'unit_purchase_price' => '999999999.99']]])->assertUnprocessable();
        $this->getJson('/api/v1/purchase-orders/'.$id)->assertJsonPath('data.total', '0.30');
    }

    public function test_purchase_snapshot_survives_catalog_rename_and_draft_requires_refresh_after_type_change(): void
    {
        $id = $this->po();
        $item = DB::table('purchase_order_items')->where('purchase_order_id', $id)->first();
        Product::find($item->product_id)->update(['name' => 'Changed']);
        $this->getJson('/api/v1/purchase-orders/'.$id)->assertJsonPath('data.items.0.product_name', 'Product');
        Product::find($item->product_id)->update(['unit' => 'box']);
        $this->patchJson('/api/v1/purchase-orders/'.$id.'/status', ['status' => 'ordered'])->assertUnprocessable();
    }

    public function test_purchasing_seed_rerun_does_not_restore_revoked_permission(): void
    {
        $role = Role::where('slug', 'inventory')->first();
        $pid = DB::table('permissions')->where('slug', 'receive_purchase_orders')->value('id');
        $role->permissions()->detach($pid);
        $counts = [DB::table('permissions')->count(), DB::table('role_permissions')->count()];
        $this->seed(PurchasingSeeder::class);
        $this->assertSame($counts, [DB::table('permissions')->count(), DB::table('role_permissions')->count()]);
        $this->assertFalse($role->permissions()->where('permissions.id', $pid)->exists());
    }

    public function test_supplier_po_filters_and_pagination_are_bounded(): void
    {
        $id = $this->po();
        $this->po();
        $sid = DB::table('purchase_orders')->where('id', $id)->value('supplier_id');
        $this->getJson('/api/v1/purchase-orders?supplier_id='.$sid.'&status=draft&per_page=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/v1/purchase-orders?per_page=101')->assertUnprocessable();
        $this->getJson('/api/v1/purchase-orders?status=approved')->assertUnprocessable();
        $this->getJson('/api/v1/purchase-orders?to='.now()->toDateString())->assertOk();
    }

    public function test_inactive_supplier_cannot_be_ordered_and_invalid_expected_date_rejected(): void
    {
        $id = $this->po();
        $sid = DB::table('purchase_orders')->where('id', $id)->value('supplier_id');
        $this->patchJson('/api/v1/purchase-orders/'.$id, ['expected_delivery_date' => '2000-01-01'])->assertUnprocessable();
        $this->patchJson('/api/v1/suppliers/'.$sid, ['is_active' => false])->assertOk();
        $this->patchJson('/api/v1/purchase-orders/'.$id.'/status', ['status' => 'ordered'])->assertUnprocessable();
    }

    public function test_stock_overflow_rolls_back_receiving_and_preserves_prior_ledger(): void
    {
        $id = $this->po();
        $pid = DB::table('purchase_order_items')->where('purchase_order_id', $id)->value('product_id');
        $this->postJson('/api/v1/stock-movements', ['product_id' => $pid, 'movement_type' => 'opening_stock', 'quantity' => 2147483647, 'reason' => 'Count'])->assertCreated();
        $this->order($id);
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id))->assertUnprocessable();
        $this->assertDatabaseCount('goods_receivings', 0);
        $this->assertDatabaseCount('stock_movements', 1);
    }

    public function test_purchase_receipt_is_filterable_in_existing_inventory_history(): void
    {
        $id = $this->po();
        $this->order($id);
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id))->assertCreated();
        $this->getJson('/api/v1/stock-movements?movement_type=purchase_receipt')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.reference_type', 'goods_receiving_item');
    }

    public function test_receipt_product_must_match_referenced_po_item_in_database(): void
    {
        $id = $this->po();
        $this->order($id);
        $rid = $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id))->assertCreated()->json('data.id');
        $item = DB::table('purchase_order_items')->where('purchase_order_id', $id)->first();
        $this->expectException(QueryException::class);
        DB::table('goods_receiving_items')->insert(['goods_receiving_id' => $rid, 'purchase_order_id' => $id, 'purchase_order_item_id' => $item->id, 'product_id' => $this->product()->id, 'quantity' => 1, 'actual_unit_price' => '1.00', 'subtotal' => '1.00']);
    }

    public function test_po_only_reader_cannot_read_supplier_internal_contact_details(): void
    {
        $id = $this->po();
        $role = Role::create(['slug' => 'reader', 'name' => 'PO reader']);
        $role->permissions()->attach(DB::table('permissions')->where('slug', 'receive_purchase_orders')->value('id'));
        $actor = User::factory()->create();
        $actor->roles()->attach($role);
        $this->actingAs($actor)->getJson('/api/v1/purchase-orders/'.$id)->assertOk()->assertJsonMissingPath('data.supplier.email')->assertJsonMissingPath('data.supplier.notes');
    }

    public function test_idempotent_replay_works_with_reordered_items_and_rejects_other_po(): void
    {
        $p = $this->product();
        $q = $this->product();
        $id = $this->po([['product_id' => $p->id, 'quantity_ordered' => 2, 'unit_purchase_price' => '1.00'], ['product_id' => $q->id, 'quantity_ordered' => 2, 'unit_purchase_price' => '1.00']]);
        $this->order($id);
        $items = DB::table('purchase_order_items')->where('purchase_order_id', $id)->get();
        $payload = $this->receipt($id, 2);
        $payload['items'] = [];
        foreach ($items as $item) {
            $payload['items'][] = ['purchase_order_item_id' => $item->id, 'quantity' => 2];
        }$this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertCreated();
        $payload['items'] = array_reverse($payload['items']);
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertOk();
        $other = $this->po();
        $this->order($other);
        $this->postJson('/api/v1/purchase-orders/'.$other.'/receivings', $payload)->assertUnprocessable();
        $this->assertDatabaseCount('goods_receivings', 1);
    }

    public function test_batch_number_zero_is_valid_and_visible_in_receipt_history(): void
    {
        $p = $this->product('medicine');
        $id = $this->po([['product_id' => $p->id, 'quantity_ordered' => 10, 'unit_purchase_price' => '1.00']]);
        $this->order($id);
        $payload = $this->receipt($id);
        $expiry = now()->addYear()->toDateString();
        $payload['items'][0] += ['batch_number' => '0', 'expiry_date' => $expiry];
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $payload)->assertCreated()->assertJsonPath('data.items.0.batch.batch_number', '0')->assertJsonPath('data.items.0.batch.expiry_date', $expiry);
    }

    public function test_inactive_accounts_and_revoked_receiver_grants_are_blocked(): void
    {
        $id = $this->po();
        $this->order($id);
        $actor = $this->actor();
        $this->actingAs($actor);
        $actor->roles()->detach();
        $this->postJson('/api/v1/purchase-orders/'.$id.'/receivings', $this->receipt($id))->assertForbidden();
        $actor = $this->actor();
        $actor->forceFill(['is_active' => false])->save();
        $this->actingAs($actor)->getJson('/api/v1/purchase-orders')->assertForbidden();
        $this->assertDatabaseCount('stock_movements', 0);
    }
}
