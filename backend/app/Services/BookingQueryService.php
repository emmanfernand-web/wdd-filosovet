<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\User;
use App\Support\BookingAccess;
use Illuminate\Support\Facades\Gate;

class BookingQueryService
{
    public function listing(User $actor, array $filters, int $perPage, bool $own = false)
    {
        Gate::forUser($actor)->authorize($own ? 'viewOwn' : 'viewAny', Booking::class);
        $query = Booking::with(['customer', 'service.category']);
        if ($own) {
            $query->whereHas('customer', fn ($q) => $q->where('user_id', $actor->id));
        } else {
            BookingAccess::scope($query, $actor);
        }
        foreach (['status', 'service_id', 'pet_id'] as $field) {
            if (isset($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }
        if (isset($filters['service_category_id'])) {
            $query->whereHas('service', fn ($q) => $q->where('service_category_id', $filters['service_category_id']));
        }
        if (isset($filters['from'])) {
            $query->where('scheduled_at', '>=', $filters['from'].' 00:00:00');
        }
        if (isset($filters['to'])) {
            $query->where('scheduled_at', '<=', $filters['to'].' 23:59:59');
        }

        return $query->orderBy('scheduled_at')->orderBy('id')->paginate(min(max($perPage, 1), 100));
    }

    public function show(User $actor, Booking $booking): Booking
    {
        Gate::forUser($actor)->authorize('view', $booking);

        return $booking->loadMissing(['customer', 'service.category']);
    }
}
