<?php

namespace App\Policies;

use App\Models\User;

class StockMovementPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('manage_inventory');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('manage_inventory');
    }
}
