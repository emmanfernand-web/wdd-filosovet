<?php

namespace App\Policies;

use App\Models\Booking;
use App\Models\User;
use App\Support\BookingAccess;

class BookingPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('manage_bookings') || ($user->hasPermission('view_bookings') && BookingAccess::categories($user) !== []);
    }

    public function viewOwn(User $user): bool
    {
        return $user->hasPermission('view_own_bookings');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('manage_bookings') || $user->hasPermission('manage_own_bookings');
    }

    public function view(User $user, Booking $booking): bool
    {
        return BookingAccess::staffCanView($user, $booking) || ($booking->customer->user_id === $user->id && $user->hasPermission('view_own_bookings'));
    }

    public function update(User $user, Booking $booking): bool
    {
        return $user->hasPermission('manage_bookings') || ($booking->customer->user_id === $user->id && $user->hasPermission('manage_own_bookings'));
    }

    public function transition(User $user, Booking $booking): bool
    {
        return $user->hasPermission('manage_bookings');
    }

    public function staffNotes(User $user, Booking $booking): bool
    {
        return $user->hasPermission('manage_bookings');
    }
}
