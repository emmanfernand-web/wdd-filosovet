<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

class InventoryAccess
{
    public static function catalog(User $user): bool
    {
        return $user->hasPermission('manage_products') || self::stock($user);
    }

    public static function stock(User $user): bool
    {
        return $user->hasPermission('manage_inventory') || $user->hasPermission('view_medication_stock');
    }

    public static function allProducts(User $user): bool
    {
        return $user->hasPermission('manage_products') || $user->hasPermission('manage_inventory');
    }

    public static function scopeProducts(Builder $query, User $user): Builder
    {
        return self::allProducts($user) ? $query : $query->where('type', 'medicine');
    }
}
