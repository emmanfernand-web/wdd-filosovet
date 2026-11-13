<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Pet;
use App\Models\Product;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\TransactionStockAllocation;
use App\Models\User;
use App\Policies\TransactionPolicy;
use App\Support\TransactionMoney as Money;
use App\Support\TransactionSummary;
use App\Support\TransactionValidation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class TransactionService
{
    public function save(User $actor, array $input, ?Transaction $transaction = null): Transaction
    {
        Gate::forUser($actor)->authorize($transaction ? 'update' : 'create', $transaction ?? Transaction::class);
        $data = Validator::make($input, TransactionValidation::draft($transaction !== null))->validate();

        return DB::transaction(function () use ($actor, $data, $transaction) {
            $booking = $this->lockBooking($transaction?->booking_id ?? ($data['booking_id'] ?? null));
            $row = $transaction ? Transaction::whereKey($transaction->id)->lockForUpdate()->firstOrFail() : new Transaction;
            Gate::forUser($actor)->authorize($transaction ? 'update' : 'create', $transaction ? $row : Transaction::class);
            if ($transaction && $row->status !== 'draft') {
                $this->invalid('Only draft is editable.');
            }
            if ($booking && in_array($booking->status->value, ['cancelled', 'no_show'], true)) {
                $this->invalid('Booking cannot be billed.');
            }
            if (! $transaction) {
                if ($booking && ($booking->customer_id !== (int) $data['customer_id'] || Transaction::where('active_booking_id', $booking->id)->lockForUpdate()->exists())) {
                    $this->invalid('Booking belongs to another customer or already has active billing.');
                }
                $row->forceFill(['transaction_number' => 'TX-'.Str::ulid(), 'customer_id' => $data['customer_id'], 'booking_id' => $booking?->id, 'active_booking_id' => $booking?->id, 'created_by' => $actor->id, 'status' => 'draft', 'subtotal' => '0.00', 'grand_total' => '0.00']);
            }
            foreach (['transaction_date', 'notes'] as $key) {
                if (array_key_exists($key, $data)) {
                    $row->$key = $data[$key];
                }
            }
            $row->save();
            if (array_key_exists('items', $data)) {
                $this->replaceItems($row, $data['items'], $booking);
            }

            return $this->loaded($row);
        }, 3);
    }

    public function transition(User $actor, Transaction $transaction, string $status): Transaction
    {
        Gate::forUser($actor)->authorize('transition', $transaction);
        if (! in_array($status, ['confirmed', 'completed', 'cancelled'], true)) {
            $this->invalid('Invalid transaction status.');
        }

        return DB::transaction(function () use ($actor, $transaction, $status) {
            $booking = $this->lockBooking($transaction->booking_id);
            $row = Transaction::whereKey($transaction->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('transition', $row);
            if ($status === $row->status) {
                return $this->loaded($row);
            }
            $summary = TransactionSummary::calculate($row, true);
            $itemIds = $row->items()->orderBy('id')->lockForUpdate()->pluck('id');
            $hasAllocations = TransactionStockAllocation::whereIn('transaction_item_id', $itemIds)->orderBy('id')->lockForUpdate()->first(['id']) !== null;
            if ($status === 'cancelled') {
                if (! in_array($row->status, ['draft', 'confirmed'], true) || $summary['gross_paid'] > 0 || $hasAllocations) {
                    $this->invalid('Cancellation is not allowed after payment or stock deduction.');
                }
                $row->forceFill(['status' => 'cancelled', 'active_booking_id' => null])->save();
            } elseif ($status === 'confirmed') {
                if ($row->status !== 'draft' || $itemIds->isEmpty()) {
                    $this->invalid('Only a nonempty draft can be confirmed.');
                }
                if ($booking && in_array($booking->status->value, ['cancelled', 'no_show'], true)) {
                    $this->invalid('Booking cannot be billed.');
                }
                app(TransactionStockService::class)->confirm($actor, $row);
                $row->forceFill(['status' => 'confirmed'])->save();
            } else {
                if ($row->status !== 'confirmed' || $summary['remaining_balance'] !== 0 || ($booking && $booking->status->value !== 'completed')) {
                    $this->invalid('Completion requires confirmed, paid and completed linked booking.');
                }
                $row->forceFill(['status' => 'completed'])->save();
            }

            return $this->loaded($row);
        }, 3);
    }

    public function listing(User $actor, array $filters, int $perPage = 20)
    {
        return DB::transaction(fn () => $this->listingSnapshot($actor, $filters, $perPage));
    }

    private function listingSnapshot(User $actor, array $filters, int $perPage)
    {
        Gate::forUser($actor)->authorize('viewAny', Transaction::class);
        $q = Transaction::query();
        if (! (new TransactionPolicy)->staffRead($actor)) {
            $q->whereHas('customer', fn ($c) => $c->where('user_id', $actor->id));
        }
        foreach (['customer_id', 'status'] as $field) {
            if (isset($filters[$field])) {
                $q->where($field, $filters[$field]);
            }
        }
        if (isset($filters['search'])) {
            $q->where('transaction_number', 'like', '%'.$filters['search'].'%');
        }
        if (isset($filters['from'])) {
            $q->whereDate('transaction_date', '>=', $filters['from']);
        }if (isset($filters['to'])) {
            $q->whereDate('transaction_date', '<=', $filters['to']);
        }

        return $q->with(['customer.user', 'booking.pet', 'creator', 'items.allocations.batch', 'payments.receiver', 'payments.refunds.actor', 'payments.transaction.customer.user'])->orderByDesc('id')->paginate(min(max($perPage, 1), 100))->through(fn ($row) => $row->setAttribute('financial_summary', TransactionSummary::calculate($row)));
    }

    public function show(User $actor, Transaction $row): Transaction
    {
        Gate::forUser($actor)->authorize('view', $row);

        return DB::transaction(fn () => $this->loaded($row));
    }

    private function loaded(Transaction $row): Transaction
    {
        $row->refresh()->load(['customer.user', 'booking.pet', 'creator', 'items.allocations.batch', 'payments.receiver', 'payments.refunds.actor', 'payments.transaction.customer.user']);

        return $row->setAttribute('financial_summary', TransactionSummary::calculate($row));
    }

    private function lockBooking(?int $id): ?Booking
    {
        if (! $id) {
            return null;
        }
        $booking = Booking::findOrFail($id);
        Pet::withTrashed()->whereKey($booking->pet_id)->lockForUpdate()->firstOrFail();

        return Booking::whereKey($id)->lockForUpdate()->firstOrFail();
    }

    private function replaceItems(Transaction $row, array $input, ?Booking $booking): void
    {
        if ($booking) {
            array_unshift($input, ['item_type' => 'service', 'service_id' => $booking->service_id, 'quantity' => 1, 'from_booking' => true]);
        }
        $products = Product::whereIn('id', array_column($input, 'product_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
        $services = Service::whereIn('id', array_column($input, 'service_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
        $seen = [];
        $total = 0;
        $lines = [];
        foreach ($input as $line) {
            $isProduct = $line['item_type'] === 'product';
            $id = $line[$isProduct ? 'product_id' : 'service_id'] ?? null;
            if (! $id || ($line[$isProduct ? 'service_id' : 'product_id'] ?? null) !== null) {
                $this->invalid('Item type and reference mismatch.');
            }
            $key = $line['item_type'].':'.$id;
            if (isset($seen[$key])) {
                $this->invalid('Duplicate item reference.');
            }$seen[$key] = true;
            $catalog = $isProduct ? $products->get($id) : $services->get($id);
            if (! $catalog?->is_active) {
                $this->invalid('Catalog item inactive.');
            }
            if (! $isProduct && ! ServiceCategory::whereKey($catalog->service_category_id)->lockForUpdate()->value('is_active')) {
                $this->invalid('Service category inactive.');
            }
            $price = $isProduct ? $catalog->selling_price : (! empty($line['from_booking']) ? $booking->price_snapshot : $catalog->price);
            if ($price === null) {
                $this->invalid('Product has no selling price.');
            }
            $subtotal = Money::line((int) $line['quantity'], Money::cents($price));
            $total = Money::add($total, $subtotal);
            $lines[] = ['item_type' => $line['item_type'], 'product_id' => $isProduct ? $id : null, 'service_id' => $isProduct ? null : $id, 'from_booking' => ! empty($line['from_booking']), 'item_name' => $catalog->name, 'description' => $catalog->description, 'product_type' => $isProduct ? $catalog->type : null, 'unit' => $isProduct ? $catalog->unit : null, 'quantity' => (int) $line['quantity'], 'unit_price' => Money::format(Money::cents($price)), 'subtotal' => Money::format($subtotal)];
        }
        $row->items()->delete();
        foreach ($lines as $line) {
            $item = (new TransactionItem)->forceFill($line + ['transaction_id' => $row->id]);
            $item->save();
        }
        $row->forceFill(['subtotal' => Money::format($total), 'grand_total' => Money::format($total)])->save();
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['transaction' => $message]);
    }
}
