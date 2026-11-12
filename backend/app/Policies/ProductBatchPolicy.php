<?php

namespace App\Policies;

use App\Models\ProductBatch;
use App\Models\User;
use App\Support\InventoryAccess;

class ProductBatchPolicy
{
    public function viewAny(User $user): bool
    {
        return InventoryAccess::stock($user);
    }

    public function view(User $user, ProductBatch $batch): bool
    {
        return InventoryAccess::stock($user) && ($user->hasPermission('manage_inventory') || $batch->product->type === 'medicine');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('manage_inventory');
    }
}
