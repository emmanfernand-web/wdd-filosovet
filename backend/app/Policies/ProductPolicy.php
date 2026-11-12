<?php

namespace App\Policies;

use App\Models\Product;
use App\Models\User;
use App\Support\InventoryAccess;

class ProductPolicy
{
    public function viewAny(User $user): bool
    {
        return InventoryAccess::catalog($user);
    }

    public function view(User $user, Product $product): bool
    {
        return InventoryAccess::catalog($user) && (InventoryAccess::allProducts($user) || $product->type === 'medicine');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('manage_products');
    }

    public function update(User $user, Product $product): bool
    {
        return $user->hasPermission('manage_products');
    }
}
