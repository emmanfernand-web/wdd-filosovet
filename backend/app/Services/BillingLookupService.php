<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Customer;
use App\Models\PaymentMethod;
use App\Models\Service;
use App\Models\Transaction;
use App\Models\User;
use App\Support\InventoryBalance;
use Illuminate\Support\Facades\Gate;

class BillingLookupService
{
    public function listing(User $actor, string $kind, array $filters, int $perPage)
    {
        if ($kind === 'payment-methods' && $actor->hasPermission('process_payments')) {
            Gate::forUser($actor)->authorize('process_payments');
        } else {
            Gate::forUser($actor)->authorize('manage_transactions');
        }
        $search = $filters['search'] ?? null;
        if ($kind === 'customers') {
            $q = Customer::with('user');
            if ($search !== null) {
                $q->whereHas('user', fn ($u) => $u->where('name', 'like', '%'.$search.'%'));
            }

            return $q->orderBy('id')->paginate($perPage)->through(fn ($c) => ['id' => $c->id, 'name' => $c->user->name]);
        }
        if ($kind === 'bookings') {
            $q = Booking::with(['pet', 'service'])->whereNotIn('status', ['cancelled', 'no_show']);
            if (isset($filters['customer_id'])) {
                $q->where('customer_id', $filters['customer_id']);
            }
            if ($search !== null) {
                $q->where('booking_code', 'like', '%'.$search.'%');
            }
            $q->addSelect(['active_transaction_id' => Transaction::select('id')->whereColumn('active_booking_id', 'bookings.id')->limit(1)]);

            return $q->orderBy('id')->paginate($perPage)->through(fn ($b) => ['id' => $b->id, 'booking_code' => $b->booking_code, 'customer_id' => $b->customer_id, 'pet' => ['id' => $b->pet_id, 'name' => $b->pet?->name], 'service' => ['id' => $b->service_id, 'name' => $b->service?->name], 'status' => $b->status->value, 'scheduled_at' => $b->scheduled_at->toISOString(), 'price_snapshot' => $b->price_snapshot, 'active_transaction_id' => $b->active_transaction_id]);
        }
        if ($kind === 'products') {
            $q = InventoryBalance::products()->where('is_active', true)->whereNotNull('selling_price');
            if ($search !== null) {
                $q->where(fn ($p) => $p->where('name', 'like', '%'.$search.'%')->orWhere('sku', 'like', '%'.$search.'%'));
            }

            return $q->orderBy('id')->paginate($perPage)->through(fn ($p) => ['id' => $p->id, 'sku' => $p->sku, 'name' => $p->name, 'type' => $p->type, 'unit' => $p->unit, 'selling_price' => $p->selling_price, 'usable_stock' => (int) $p->usable_stock]);
        }
        if ($kind === 'services') {
            $q = Service::where('is_active', true)->whereHas('category', fn ($c) => $c->where('is_active', true));
            if ($search !== null) {
                $q->where('name', 'like', '%'.$search.'%');
            }

            return $q->orderBy('id')->paginate($perPage)->through(fn ($s) => ['id' => $s->id, 'name' => $s->name, 'price' => $s->price, 'service_category_id' => $s->service_category_id]);
        }
        abort_unless($kind === 'payment-methods', 404);

        return PaymentMethod::where('is_active', true)->orderBy('id')->paginate($perPage)->through(fn ($m) => ['code' => $m->code, 'name' => $m->name]);
    }
}
