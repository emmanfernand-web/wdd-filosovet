<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Customer;
use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\PaymentRefund;
use App\Models\Permission;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Role;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\StockMovement;
use App\Models\Transaction;
use App\Models\TransactionStockAllocation;
use App\Models\User;
use App\Services\InventoryService;
use App\Services\PaymentService;
use App\Support\TransactionSummary;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\TransactionsPaymentsSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\InMemoryDatabaseTestCase;

class TransactionsPaymentsTest extends InMemoryDatabaseTestCase
{
    private User $cashier;

    private Customer $customer;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(DatabaseSeeder::class);
        $this->cashier = User::factory()->create();
        $role = Role::where('slug', 'kasir')->firstOrFail();
        $role->permissions()->syncWithoutDetaching([Permission::firstOrCreate(['slug' => 'manage_transactions'], ['name' => 'Manage transactions'])->id]);
        $this->cashier->roles()->attach($role);
        $this->customer = User::factory()->create()->customer()->create([]);
        $this->actingAs($this->cashier);
    }

    private function service(string $price = '100.00'): Service
    {
        $category = ServiceCategory::firstOrCreate(['slug' => 'grooming'], ['name' => 'Grooming']);

        return Service::create(['service_category_id' => $category->id, 'name' => 'Wash', 'slug' => 'wash-'.uniqid(), 'price' => $price]);
    }

    private function product(string $price = '12.35', string $type = 'general'): Product
    {
        return Product::create(['sku' => 'P-'.uniqid(), 'name' => 'Shampoo', 'type' => $type, 'unit' => 'piece', 'selling_price' => $price]);
    }

    private function draft(array $items = [], ?Booking $booking = null): int
    {
        $data = ['customer_id' => $this->customer->id, 'transaction_date' => now('UTC')->toDateString(), 'items' => $items];
        if ($booking) {
            $data['booking_id'] = $booking->id;
        }

        return $this->postJson('/api/v1/transactions', $data)->assertCreated()->json('data.id');
    }

    private function booking(string $status = 'pending'): Booking
    {
        $pet = $this->customer->pets()->create(['name' => 'Milo', 'species' => 'cat']);
        $b = (new Booking)->forceFill(['booking_code' => 'FV-'.strtoupper(uniqid()), 'customer_id' => $this->customer->id, 'pet_id' => $pet->id, 'service_id' => $this->service()->id, 'scheduled_at' => now()->addDay(), 'status' => $status, 'price_snapshot' => '80.00']);
        $b->save();

        return $b;
    }

    public function test_combined_draft_uses_catalog_prices_and_server_totals(): void
    {
        $service = $this->service();
        $product = $this->product();
        $id = $this->draft([['item_type' => 'service', 'service_id' => $service->id, 'quantity' => 1], ['item_type' => 'product', 'product_id' => $product->id, 'quantity' => 2]]);
        $this->getJson('/api/v1/transactions/'.$id)->assertOk()->assertJsonPath('data.grand_total', '124.70')->assertJsonPath('data.discount_amount', '0.00')->assertJsonPath('data.tax_amount', '0.00')->assertJsonPath('data.total_paid', '0.00')->assertJsonPath('data.remaining_balance', '124.70')->assertJsonCount(2, 'data.items');
    }

    public function test_catalog_selling_price_can_be_managed_but_cashier_cannot_override(): void
    {
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('slug', 'admin')->firstOrFail());
        $this->actingAs($admin)->postJson('/api/v1/products', ['sku' => 'SALE', 'name' => 'Food', 'type' => 'general', 'unit' => 'piece', 'selling_price' => '10.25'])->assertCreated()->assertJsonPath('data.selling_price', '10.25');
        $p = $this->product();
        $this->actingAs($this->cashier);
        $this->postJson('/api/v1/transactions', ['customer_id' => $this->customer->id, 'transaction_date' => now()->toDateString(), 'items' => [['item_type' => 'product', 'product_id' => $p->id, 'quantity' => 1, 'unit_price' => '0.01']]])->assertUnprocessable();
        $this->patchJson('/api/v1/products/'.$p->id, ['selling_price' => '0.01'])->assertForbidden();
    }

    public function test_unpriced_and_inactive_products_and_services_are_rejected(): void
    {
        $p = $this->product();
        $p->forceFill(['selling_price' => null])->save();
        $base = ['customer_id' => $this->customer->id, 'transaction_date' => now()->toDateString()];
        $this->postJson('/api/v1/transactions', $base + ['items' => [['item_type' => 'product', 'product_id' => $p->id, 'quantity' => 1]]])->assertUnprocessable();
        $p->forceFill(['selling_price' => '1.00', 'is_active' => false])->save();
        $this->postJson('/api/v1/transactions', $base + ['items' => [['item_type' => 'product', 'product_id' => $p->id, 'quantity' => 1]]])->assertUnprocessable();
        $s = $this->service();
        $s->update(['is_active' => false]);
        $this->postJson('/api/v1/transactions', $base + ['items' => [['item_type' => 'service', 'service_id' => $s->id, 'quantity' => 1]]])->assertUnprocessable();
    }

    public function test_notes_patch_preserves_snapshot_and_item_replacement_reprices_explicitly(): void
    {
        $s = $this->service('0.10');
        $id = $this->draft([['item_type' => 'service', 'service_id' => $s->id, 'quantity' => 3]]);
        $s->update(['price' => '2.00']);
        $this->patchJson('/api/v1/transactions/'.$id, ['notes' => 'Keep snapshot'])->assertOk()->assertJsonPath('data.grand_total', '0.30');
        $this->patchJson('/api/v1/transactions/'.$id, ['items' => [['item_type' => 'service', 'service_id' => $s->id, 'quantity' => 3]]])->assertOk()->assertJsonPath('data.grand_total', '6.00');
    }

    public function test_booking_automatically_bills_snapshot_once_with_ownership_validation(): void
    {
        $b = $this->booking();
        $id = $this->draft([], $b);
        $this->getJson('/api/v1/transactions/'.$id)->assertOk()->assertJsonPath('data.grand_total', '80.00')->assertJsonPath('data.booking.id', $b->id)->assertJsonPath('data.booking.pet.name', 'Milo');
        $this->postJson('/api/v1/transactions', ['customer_id' => $this->customer->id, 'booking_id' => $b->id, 'transaction_date' => now()->toDateString(), 'items' => []])->assertUnprocessable();
        $other = User::factory()->create()->customer()->create([]);
        $this->postJson('/api/v1/transactions', ['customer_id' => $other->id, 'booking_id' => $b->id, 'transaction_date' => now()->toDateString(), 'items' => []])->assertUnprocessable();
    }

    public function test_cancelled_and_no_show_bookings_cannot_be_billed(): void
    {
        foreach (['cancelled', 'no_show'] as $status) {
            $b = $this->booking($status);
            $this->postJson('/api/v1/transactions', ['customer_id' => $this->customer->id, 'booking_id' => $b->id, 'transaction_date' => now()->toDateString(), 'items' => []])->assertUnprocessable();
        }
    }

    public function test_duplicates_bad_references_and_fractional_quantities_are_rejected(): void
    {
        $s = $this->service();
        $base = ['customer_id' => $this->customer->id, 'transaction_date' => now()->toDateString()];
        $item = ['item_type' => 'service', 'service_id' => $s->id, 'quantity' => 1];
        $this->postJson('/api/v1/transactions', $base + ['items' => [$item, $item]])->assertUnprocessable();
        foreach ([0, -1, 1.5, true] as $q) {
            $this->postJson('/api/v1/transactions', $base + ['items' => [array_replace($item, ['quantity' => $q])]])->assertUnprocessable();
        }
        $this->postJson('/api/v1/transactions', $base + ['items' => [$item + ['product_id' => $this->product()->id]]])->assertUnprocessable();
        $this->postJson('/api/v1/transactions', $base + ['items' => [$item], 'grand_total' => '0.01'])->assertUnprocessable();
    }

    public function test_customer_sees_only_own_transactions_and_cannot_write(): void
    {
        $s = $this->service();
        $id = $this->draft([['item_type' => 'service', 'service_id' => $s->id, 'quantity' => 1]]);
        $owner = $this->customer->user;
        $owner->roles()->attach(Role::where('slug', 'customer')->firstOrFail());
        $this->actingAs($owner)->getJson('/api/v1/transactions/'.$id)->assertOk();
        $this->getJson('/api/v1/transactions')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson('/api/v1/transactions', [])->assertForbidden();
        $other = User::factory()->create();
        $other->roles()->attach(Role::where('slug', 'customer')->firstOrFail());
        $this->actingAs($other)->getJson('/api/v1/transactions/'.$id)->assertForbidden();
        $this->getJson('/api/v1/transactions')->assertOk()->assertJsonCount(0, 'data');
    }

    private function confirm(int $id): void
    {
        $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'confirmed'])->assertOk()->assertJsonPath('data.status', 'confirmed');
    }

    private function payment(int $id, string $amount, ?string $key = null, string $status = 'succeeded')
    {
        return $this->postJson('/api/v1/transactions/'.$id.'/payments', ['idempotency_key' => $key ?? (string) Str::uuid(), 'payment_date' => now('UTC')->toDateString(), 'amount' => $amount, 'method' => 'cash', 'status' => $status]);
    }

    private function opening(Product $p, int $quantity, ?int $batch = null): void
    {
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('slug', 'admin')->firstOrFail());
        app(InventoryService::class)->record($admin, ['product_id' => $p->id, 'product_batch_id' => $batch, 'movement_type' => 'opening_stock', 'quantity' => $quantity, 'reason' => 'Initial count']);
    }

    public function test_confirmation_posts_sale_once_and_freezes_items(): void
    {
        $p = $this->product();
        $this->opening($p, 5);
        $id = $this->draft([['item_type' => 'product', 'product_id' => $p->id, 'quantity' => 2]]);
        $this->assertSame(1, DB::table('stock_movements')->count());
        $this->confirm($id);
        $this->confirm($id);
        $this->assertSame(2, DB::table('stock_movements')->count());
        $m = DB::table('stock_movements')->where('movement_type', 'sale')->first();
        $this->assertSame('out', $m->direction);
        $this->assertSame('sale_transaction_item', $m->reference_type);
        $this->assertSame(2, $m->quantity);
        $this->patchJson('/api/v1/transactions/'.$id, ['notes' => 'Cannot edit'])->assertUnprocessable();
        $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'cancelled'])->assertUnprocessable();
    }

    public function test_insufficient_stock_and_second_movement_failure_roll_back_confirmation(): void
    {
        $p = $this->product();
        $this->opening($p, 1);
        $id = $this->draft([['item_type' => 'product', 'product_id' => $p->id, 'quantity' => 2]]);
        $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'confirmed'])->assertUnprocessable();
        $this->assertSame(0, DB::table('transaction_stock_allocations')->count());
        $this->assertSame(1, DB::table('stock_movements')->count());
        $this->getJson('/api/v1/transactions/'.$id)->assertOk()->assertJsonPath('data.status', 'draft');
    }

    public function test_medicine_fefo_splits_batches_and_excludes_expired_stock(): void
    {
        $p = $this->product('1.00', 'medicine');
        $late = (new ProductBatch)->forceFill(['product_id' => $p->id, 'batch_number' => 'LATE', 'expiry_date' => now('UTC')->addDays(10)->toDateString()]);
        $late->save();
        $early = (new ProductBatch)->forceFill(['product_id' => $p->id, 'batch_number' => 'EARLY', 'expiry_date' => now('UTC')->addDay()->toDateString()]);
        $early->save();
        $expired = (new ProductBatch)->forceFill(['product_id' => $p->id, 'batch_number' => 'OLD', 'expiry_date' => now('UTC')->subDay()->toDateString()]);
        $expired->save();
        $this->opening($p, 5, $late->id);
        $this->opening($p, 2, $early->id);
        $this->opening($p, 9, $expired->id);
        $id = $this->draft([['item_type' => 'product', 'product_id' => $p->id, 'quantity' => 4]]);
        $this->confirm($id);
        $rows = DB::table('stock_movements')->where('movement_type', 'sale')->orderBy('id')->get();
        $this->assertSame([$early->id, $late->id], $rows->pluck('product_batch_id')->all());
        $this->assertSame([2, 2], $rows->pluck('quantity')->all());
        $id2 = $this->draft([['item_type' => 'product', 'product_id' => $p->id, 'quantity' => 4]]);
        $this->patchJson('/api/v1/transactions/'.$id2.'/status', ['status' => 'confirmed'])->assertUnprocessable();
    }

    public function test_partial_full_payment_and_receipts_derive_balances(): void
    {
        $id = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $this->confirm($id);
        $this->payment($id, '40.00')->assertCreated();
        $this->getJson('/api/v1/transactions/'.$id)->assertJsonPath('data.payment_status', 'partially_paid')->assertJsonPath('data.remaining_balance', '60.00');
        $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'completed'])->assertUnprocessable();
        $this->payment($id, '60.00')->assertCreated();
        $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'completed'])->assertOk();
        $this->getJson('/api/v1/transactions/'.$id.'/receipt')->assertOk()->assertJsonPath('data.total_paid', '100.00')->assertJsonPath('data.remaining_balance', '0.00')->assertJsonCount(2, 'data.payments');
    }

    public function test_payment_retries_are_idempotent_and_overpayment_is_rejected(): void
    {
        $id = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $this->confirm($id);
        $key = (string) Str::uuid();
        $first = $this->payment($id, '60.00', $key)->assertCreated()->json('data.id');
        $this->payment($id, '60.00', $key)->assertOk()->assertJsonPath('data.id', $first);
        $this->payment($id, '61.00', $key)->assertUnprocessable();
        $this->payment($id, '40.01')->assertUnprocessable();
        $this->assertSame(1, DB::table('payments')->count());
    }

    public function test_failed_and_cancelled_payments_do_not_change_paid_balance(): void
    {
        $id = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $this->confirm($id);
        $this->payment($id, '150.00', null, 'failed')->assertCreated();
        $this->payment($id, '100.00', null, 'cancelled')->assertCreated();
        $this->getJson('/api/v1/transactions/'.$id)->assertJsonPath('data.total_paid', '0.00')->assertJsonPath('data.remaining_balance', '100.00')->assertJsonPath('data.payment_status', 'unpaid');
    }

    public function test_cancelled_draft_releases_booking_and_confirmed_paid_cannot_cancel(): void
    {
        $b = $this->booking();
        $id = $this->draft([], $b);
        $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'cancelled'])->assertOk();
        $id2 = $this->draft([], $b);
        $this->confirm($id2);
        $this->payment($id2, '1.00')->assertCreated();
        $this->patchJson('/api/v1/transactions/'.$id2.'/status', ['status' => 'cancelled'])->assertUnprocessable();
        $this->assertSame('pending', $b->fresh()->status->value);
    }

    public function test_refund_is_immutable_money_only_with_cap_and_idempotency(): void
    {
        $id = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $this->confirm($id);
        $pid = $this->payment($id, '100.00')->assertCreated()->json('data.id');
        $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'completed'])->assertOk();
        $data = ['idempotency_key' => (string) Str::uuid(), 'refund_date' => now('UTC')->toDateString(), 'amount' => '25.00', 'reason' => 'Customer refund'];
        $this->postJson('/api/v1/payments/'.$pid.'/refunds', $data)->assertForbidden();
        $permission = Permission::firstOrCreate(['slug' => 'manage_refunds'], ['name' => 'Refund']);
        $this->cashier->roles->first()->permissions()->attach($permission);
        $rid = $this->postJson('/api/v1/payments/'.$pid.'/refunds', $data)->assertCreated()->json('data.id');
        $this->postJson('/api/v1/payments/'.$pid.'/refunds', $data)->assertOk()->assertJsonPath('data.id', $rid);
        $this->postJson('/api/v1/payments/'.$pid.'/refunds', array_replace($data, ['amount' => '26.00']))->assertUnprocessable();
        $this->postJson('/api/v1/payments/'.$pid.'/refunds', array_replace($data, ['idempotency_key' => (string) Str::uuid(), 'amount' => '75.01']))->assertUnprocessable();
        $this->getJson('/api/v1/transactions/'.$id)->assertJsonPath('data.total_paid', '75.00')->assertJsonPath('data.total_refunded', '25.00')->assertJsonPath('data.remaining_balance', '25.00')->assertJsonPath('data.refund_status', 'partially_refunded')->assertJsonPath('data.status', 'completed');
        $this->payment($id, '25.00')->assertCreated();
        $this->assertSame(0, DB::table('stock_movements')->count());
    }

    public function test_billing_lookup_is_minimal_and_does_not_grant_other_module_access(): void
    {
        $p = $this->product();
        $b = $this->booking();
        $b->forceFill(['staff_notes' => 'SECRET NOTE'])->save();
        $this->getJson('/api/v1/billing/customers?search='.$this->customer->user->name)->assertOk()->assertJsonPath('data.0.id', $this->customer->id)->assertJsonMissingPath('data.0.email')->assertJsonMissingPath('data.0.address');
        $this->getJson('/api/v1/billing/bookings?customer_id='.$this->customer->id)->assertOk()->assertJsonMissingPath('data.0.staff_notes');
        $this->getJson('/api/v1/billing/products')->assertOk()->assertJsonPath('data.0.selling_price', '12.35');
        $this->getJson('/api/v1/customers')->assertForbidden();
        $this->getJson('/api/v1/stock-movements')->assertForbidden();
    }

    public function test_empty_draft_cannot_confirm_but_free_service_can_complete_without_payment(): void
    {
        $id = $this->draft();
        $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'confirmed'])->assertUnprocessable();
        $free = $this->draft([['item_type' => 'service', 'service_id' => $this->service('0.00')->id, 'quantity' => 1]]);
        $this->confirm($free);
        $this->patchJson('/api/v1/transactions/'.$free.'/status', ['status' => 'completed'])->assertOk()->assertJsonPath('data.payment_status', 'paid');
        $this->payment($free, '0.01')->assertUnprocessable();
    }

    public function test_booking_completion_is_required_but_payment_never_changes_booking_status(): void
    {
        $b = $this->booking();
        $id = $this->draft([], $b);
        $this->confirm($id);
        $this->payment($id, '80.00')->assertCreated();
        $this->assertSame('pending', $b->fresh()->status->value);
        $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'completed'])->assertUnprocessable();
        $b->forceFill(['status' => 'completed'])->save();
        $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'completed'])->assertOk();
    }

    public function test_confirmed_unpaid_service_cancellation_releases_booking_but_preserves_history(): void
    {
        $b = $this->booking();
        $id = $this->draft([], $b);
        $this->confirm($id);
        $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'cancelled'])->assertOk()->assertJsonPath('data.booking.id', $b->id);
        $this->payment($id, '1.00')->assertUnprocessable();
        $this->draft([], $b);
    }

    public function test_payments_are_rejected_on_draft_and_bad_money_and_method_are_rejected(): void
    {
        $id = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $this->payment($id, '1.00')->assertUnprocessable();
        $this->confirm($id);
        foreach (['0.00', '-1.00', '1.001', '1e2', '99999999999999999.99'] as $amount) {
            $this->payment($id, $amount)->assertUnprocessable();
        }
        $this->postJson('/api/v1/transactions/'.$id.'/payments', ['idempotency_key' => (string) Str::uuid(), 'payment_date' => now()->toDateString(), 'amount' => '1.00', 'method' => 'unknown', 'status' => 'succeeded'])->assertUnprocessable();
    }

    public function test_payment_replay_works_after_completion_and_method_deactivation_but_not_revocation(): void
    {
        $id = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $this->confirm($id);
        $key = (string) Str::uuid();
        $pid = $this->payment($id, '100.00', $key)->assertCreated()->json('data.id');
        $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'completed'])->assertOk();
        PaymentMethod::where('code', 'cash')->update(['is_active' => false]);
        $this->payment($id, '100.00', $key)->assertOk()->assertJsonPath('data.id', $pid);
        $this->cashier->roles->first()->permissions()->detach(Permission::where('slug', 'process_payments')->firstOrFail());
        $this->payment($id, '100.00', $key)->assertForbidden();
    }

    public function test_cross_transaction_payment_uuid_and_cross_payment_refund_uuid_are_rejected(): void
    {
        $first = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $second = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $this->confirm($first);
        $this->confirm($second);
        $key = (string) Str::uuid();
        $p1 = $this->payment($first, '10.00', $key)->assertCreated()->json('data.id');
        $this->payment($second, '10.00', $key)->assertUnprocessable();
        $p2 = $this->payment($second, '10.00')->assertCreated()->json('data.id');
        $this->grantRefund();
        $data = ['idempotency_key' => (string) Str::uuid(), 'refund_date' => now()->toDateString(), 'amount' => '1.00', 'reason' => 'Adjustment'];
        $this->postJson('/api/v1/payments/'.$p1.'/refunds', $data)->assertCreated();
        $this->postJson('/api/v1/payments/'.$p2.'/refunds', $data)->assertUnprocessable();
    }

    private function grantRefund(): void
    {
        $this->cashier->roles->first()->permissions()->syncWithoutDetaching([Permission::where('slug', 'manage_refunds')->firstOrFail()->id]);
    }

    public function test_full_refund_caps_history_and_cannot_refund_failed_payment(): void
    {
        $id = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $this->confirm($id);
        $failed = $this->payment($id, '100.00', null, 'failed')->assertCreated()->json('data.id');
        $pid = $this->payment($id, '20.00')->assertCreated()->json('data.id');
        $this->grantRefund();
        $data = ['idempotency_key' => (string) Str::uuid(), 'refund_date' => now()->toDateString(), 'amount' => '20.00', 'reason' => 'Return of funds'];
        $this->postJson('/api/v1/payments/'.$failed.'/refunds', $data)->assertUnprocessable();
        $this->postJson('/api/v1/payments/'.$pid.'/refunds', array_replace($data, ['reason' => ' ']))->assertUnprocessable();
        $this->postJson('/api/v1/payments/'.$pid.'/refunds', $data)->assertCreated();
        $this->postJson('/api/v1/payments/'.$pid.'/refunds', array_replace($data, ['idempotency_key' => (string) Str::uuid(), 'amount' => '0.01']))->assertUnprocessable();
        $this->getJson('/api/v1/transactions/'.$id)->assertJsonPath('data.refund_status', 'refunded')->assertJsonPath('data.total_paid', '0.00')->assertJsonPath('data.remaining_balance', '100.00');
        $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'cancelled'])->assertUnprocessable();
    }

    public function test_financial_and_confirmed_item_models_are_immutable(): void
    {
        $id = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $this->confirm($id);
        $pid = $this->payment($id, '1.00')->assertCreated()->json('data.id');
        foreach ([fn () => Payment::findOrFail($pid)->forceFill(['amount' => '0.00'])->save(), fn () => Payment::findOrFail($pid)->delete(), fn () => Transaction::findOrFail($id)->items->first()->forceFill(['quantity' => 2])->save(), fn () => Transaction::findOrFail($id)->forceFill(['notes' => 'Changed'])->save()] as $operation) {
            try {
                $operation();
                $this->fail('Immutable model write accepted');
            } catch (\LogicException) {
                $this->addToAssertionCount(1);
            }
        }
    }

    public function test_second_sale_movement_and_status_failure_roll_back_all_writes(): void
    {
        $p = $this->product();
        $q = $this->product();
        $this->opening($p, 5);
        $this->opening($q, 5);
        $id = $this->draft([['item_type' => 'product', 'product_id' => $p->id, 'quantity' => 1], ['item_type' => 'product', 'product_id' => $q->id, 'quantity' => 1]]);
        $count = 0;
        StockMovement::creating(function ($m) use (&$count) {
            if ($m->movement_type === 'sale' && ++$count === 2) {
                throw new \RuntimeException('Injected second movement failure');
            }
        });
        $this->withoutExceptionHandling();
        try {
            $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'confirmed']);
            $this->fail('Expected injected failure');
        } catch (\RuntimeException $e) {
            $this->assertSame('Injected second movement failure', $e->getMessage());
        }
        $this->assertSame(2, DB::table('stock_movements')->count());
        $this->assertSame(0, DB::table('transaction_stock_allocations')->count());
        $this->assertSame('draft', DB::table('transactions')->where('id', $id)->value('status'));
        Transaction::updating(function ($t) {
            if ($t->isDirty('status') && $t->status === 'confirmed') {
                throw new \RuntimeException('Injected status failure');
            }
        });
        try {
            $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'confirmed']);
            $this->fail('Expected status failure');
        } catch (\RuntimeException $e) {
            $this->assertSame('Injected status failure', $e->getMessage());
        }
        $this->assertSame(2, DB::table('stock_movements')->count());
        $this->assertSame(0, DB::table('transaction_stock_allocations')->count());
    }

    public function test_payment_and_refund_save_failures_roll_back_history(): void
    {
        $id = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $this->confirm($id);
        $throw = true;
        Payment::created(function () use (&$throw) {
            if ($throw) {
                throw new \RuntimeException('Payment persistence failure');
            }
        });
        $this->withoutExceptionHandling();
        try {
            $this->payment($id, '10.00');
            $this->fail('Expected rollback');
        } catch (\RuntimeException $e) {
            $this->assertSame('Payment persistence failure', $e->getMessage());
        }
        $this->assertSame(0, DB::table('payments')->count());
        $throw = false;
        $pid = $this->payment($id, '10.00')->assertCreated()->json('data.id');
        $this->grantRefund();
        PaymentRefund::created(fn () => throw new \RuntimeException('Refund persistence failure'));
        try {
            $this->postJson('/api/v1/payments/'.$pid.'/refunds', ['idempotency_key' => (string) Str::uuid(), 'refund_date' => now()->toDateString(), 'amount' => '1.00', 'reason' => 'Refund']);
            $this->fail('Expected refund rollback');
        } catch (\RuntimeException $e) {
            $this->assertSame('Refund persistence failure', $e->getMessage());
        }
        $this->assertSame(0, DB::table('payment_refunds')->count());
    }

    public function test_seeder_is_idempotent_and_does_not_restore_revoked_grants(): void
    {
        $role = Role::where('slug', 'kasir')->firstOrFail();
        $permission = Permission::where('slug', 'manage_transactions')->firstOrFail();
        $role->permissions()->detach($permission);
        $counts = [DB::table('permissions')->count(), DB::table('role_permissions')->count(), DB::table('payment_methods')->count()];
        $this->seed(TransactionsPaymentsSeeder::class);
        $this->seed(TransactionsPaymentsSeeder::class);
        $this->assertSame($counts, [DB::table('permissions')->count(), DB::table('role_permissions')->count(), DB::table('payment_methods')->count()]);
        $this->assertFalse($this->cashier->hasPermission('manage_transactions'));
        $this->assertFalse(Role::where('slug', 'inventory')->firstOrFail()->permissions()->where('slug', 'manage_transactions')->exists());
    }

    public function test_guest_inactive_user_and_ungranted_roles_cannot_use_billing(): void
    {
        $this->cashier->forceFill(['is_active' => false])->save();
        $this->getJson('/api/v1/transactions')->assertForbidden();
        $other = User::factory()->create();
        $other->roles()->attach(Role::where('slug', 'resepsionis')->firstOrFail());
        $this->actingAs($other)->getJson('/api/v1/billing/customers')->assertForbidden();
        $this->postJson('/api/v1/transactions', [])->assertForbidden();
        Auth::forgetGuards();
        $this->getJson('/api/v1/transactions')->assertUnauthorized();
    }

    public function test_price_and_total_overflow_and_product_type_mutation_are_rejected(): void
    {
        $admin = User::factory()->create();
        $admin->roles()->attach(Role::where('slug', 'admin')->firstOrFail());
        $p = $this->product();
        $this->actingAs($admin)->patchJson('/api/v1/products/'.$p->id, ['selling_price' => '9999999999.99'])->assertUnprocessable();
        $p->update(['selling_price' => '999999999.99']);
        $this->actingAs($this->cashier);
        $this->postJson('/api/v1/transactions', ['customer_id' => $this->customer->id, 'transaction_date' => now()->toDateString(), 'items' => [['item_type' => 'product', 'product_id' => $p->id, 'quantity' => 2147483647]]])->assertUnprocessable();
        $id = $this->draft([['item_type' => 'product', 'product_id' => $p->id, 'quantity' => 1]]);
        $p->update(['type' => 'medicine']);
        $this->patchJson('/api/v1/transactions/'.$id.'/status', ['status' => 'confirmed'])->assertUnprocessable();
    }

    public function test_read_summary_uses_one_consistent_financial_snapshot(): void
    {
        $id = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $this->confirm($id);
        $transaction = Transaction::findOrFail($id);
        $inserted = false;
        $this->grantRefund();
        // Simulate a complete payment+refund committing after the first financial SELECT.
        DB::listen(function ($query) use (&$inserted, $transaction) {
            if (! $inserted && str_contains($query->sql, 'from "payments"')) {
                $inserted = true;
                [$payment] = app(PaymentService::class)->record($this->cashier, $transaction, ['idempotency_key' => (string) Str::uuid(), 'payment_date' => now()->toDateString(), 'amount' => '100.00', 'method' => 'cash', 'status' => 'succeeded']);
                app(PaymentService::class)->refund($this->cashier, $payment, ['idempotency_key' => (string) Str::uuid(), 'refund_date' => now()->toDateString(), 'amount' => '100.00', 'reason' => 'Snapshot check']);
            }
        });
        $summary = TransactionSummary::calculate($transaction);
        $this->assertSame($summary['gross_paid'], $summary['total_refunded']);
        $this->assertSame(0, $summary['total_paid']);
    }

    public function test_confirmed_item_cannot_be_moved_to_another_draft(): void
    {
        $id = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $other = $this->draft();
        $this->confirm($id);
        $item = Transaction::findOrFail($id)->items->first();
        $this->expectException(\LogicException::class);
        $item->forceFill(['transaction_id' => $other])->save();
    }

    public function test_database_constraints_reject_allocation_product_and_refund_parent_mismatch(): void
    {
        $p = $this->product();
        $q = $this->product();
        $this->opening($p, 1);
        $id = $this->draft([['item_type' => 'product', 'product_id' => $p->id, 'quantity' => 1]]);
        $this->confirm($id);
        $allocation = DB::table('transaction_stock_allocations')->first();
        try {
            DB::table('transaction_stock_allocations')->insert(['transaction_item_id' => $allocation->transaction_item_id, 'product_id' => $q->id, 'quantity' => 1]);
            $this->fail('Composite item FK accepted mismatch');
        } catch (QueryException) {
            $this->addToAssertionCount(1);
        }
        $this->expectException(QueryException::class);
        DB::table('transaction_stock_allocations')->insert(['transaction_item_id' => $allocation->transaction_item_id, 'product_id' => $p->id, 'quantity' => 1, 'stock_movement_id' => $allocation->stock_movement_id]);
    }

    public function test_payment_only_permission_does_not_allow_draft_writes_and_customer_cannot_read_other_receipts(): void
    {
        $id = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $this->confirm($id);
        $this->cashier->roles->first()->permissions()->detach(Permission::where('slug', 'manage_transactions')->firstOrFail());
        $pid = $this->payment($id, '1.00')->assertCreated()->json('data.id');
        $this->postJson('/api/v1/transactions', [])->assertForbidden();
        $this->getJson('/api/v1/billing/payment-methods')->assertOk();
        $this->getJson('/api/v1/billing/customers')->assertForbidden();
        $other = User::factory()->create();
        $other->roles()->attach(Role::where('slug', 'customer')->firstOrFail());
        $this->actingAs($other)->getJson('/api/v1/payments/'.$pid.'/receipt')->assertForbidden();
        $this->getJson('/api/v1/transactions/'.$id.'/payments')->assertForbidden();
    }

    public function test_product_price_snapshot_survives_catalog_changes_and_inactive_history(): void
    {
        $p = $this->product('0.10');
        $this->opening($p, 3);
        $id = $this->draft([['item_type' => 'product', 'product_id' => $p->id, 'quantity' => 3]]);
        $p->update(['selling_price' => '99.00', 'name' => 'Renamed']);
        $this->confirm($id);
        $p->update(['is_active' => false]);
        $this->getJson('/api/v1/transactions/'.$id.'/receipt')->assertOk()->assertJsonPath('data.items.0.name', 'Shampoo')->assertJsonPath('data.items.0.unit_price', '0.10')->assertJsonPath('data.grand_total', '0.30');
        $this->payment($id, '0.10')->assertCreated();
        $this->payment($id, '0.20')->assertCreated();
        $this->getJson('/api/v1/transactions/'.$id)->assertJsonPath('data.remaining_balance', '0.00');
    }

    public function test_refund_and_allocation_cannot_be_updated_or_deleted_through_models(): void
    {
        $p = $this->product();
        $this->opening($p, 1);
        $id = $this->draft([['item_type' => 'product', 'product_id' => $p->id, 'quantity' => 1]]);
        $this->confirm($id);
        $pid = $this->payment($id, '1.00')->assertCreated()->json('data.id');
        $this->grantRefund();
        $rid = $this->postJson('/api/v1/payments/'.$pid.'/refunds', ['idempotency_key' => (string) Str::uuid(), 'refund_date' => now()->toDateString(), 'amount' => '1.00', 'reason' => 'Refund'])->assertCreated()->json('data.id');
        foreach ([PaymentRefund::findOrFail($rid), TransactionStockAllocation::firstOrFail()] as $record) {
            foreach (['save', 'delete'] as $action) {
                try {
                    if ($action === 'save') {
                        $record->forceFill(['quantity' => 99]);
                    }$record->$action();
                    $this->fail('History mutation accepted');
                } catch (\LogicException) {
                    $this->addToAssertionCount(1);
                }
            }
        }
        $this->assertSame('confirmed', DB::table('transactions')->where('id', $id)->value('status'));
        $this->assertSame(2, DB::table('stock_movements')->count());
    }

    public function test_payment_receipt_includes_transaction_and_customer_without_profile_secrets(): void
    {
        $id = $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $this->confirm($id);
        $pid = $this->payment($id, '10.00')->assertCreated()->json('data.id');
        $this->getJson('/api/v1/payments/'.$pid.'/receipt')->assertOk()->assertJsonPath('data.transaction.id', $id)->assertJsonPath('data.transaction.customer.id', $this->customer->id)->assertJsonPath('data.transaction.customer.name', $this->customer->user->name)->assertJsonMissingPath('data.transaction.customer.email')->assertJsonMissingPath('data.transaction.customer.password');
    }

    public function test_transaction_filters_accept_independent_date_bounds_and_validate_ranges(): void
    {
        $this->draft([['item_type' => 'service', 'service_id' => $this->service()->id, 'quantity' => 1]]);
        $this->getJson('/api/v1/transactions?to='.now()->toDateString())->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/transactions?from='.now()->toDateString())->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/transactions?from=2026-12-31&to=2026-01-01')->assertUnprocessable();
        $this->getJson('/api/v1/transactions?per_page=0')->assertUnprocessable();
    }
}
