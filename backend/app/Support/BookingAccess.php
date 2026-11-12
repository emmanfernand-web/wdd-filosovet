<?php

namespace App\Support;

use App\Models\Booking;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class BookingAccess
{
    public static function global(User $user): bool
    {
        return $user->hasPermission('manage_bookings');
    }

    public static function categories(User $user): array
    {
        $categories = [];
        foreach (['manage_medical_records' => 'klinik-dokter', 'manage_grooming' => 'grooming', 'manage_hotel' => 'pet-hotel'] as $permission => $slug) {
            if ($user->hasPermission($permission)) {
                $categories[] = $slug;
            }
        }

        return $categories;
    }

    public static function staffCanView(User $user, Booking $booking): bool
    {
        return self::global($user) || ($user->hasPermission('view_bookings') && in_array($booking->service->category->slug, self::categories($user), true));
    }

    public static function scope(Builder $query, User $user): Builder
    {
        return self::global($user) ? $query : $query->whereHas('service.category', fn ($q) => $q->whereIn('slug', self::categories($user)));
    }
}
