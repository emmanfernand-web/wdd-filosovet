<?php

namespace App\Policies;

use App\Models\ProductCategory;
use App\Models\User;

class ProductCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('manage_products') || $user->hasPermission('manage_inventory');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('manage_products');
    }

    public function update(User $user, ProductCategory $category): bool
    {
        return $user->hasPermission('manage_products');
    }
}
