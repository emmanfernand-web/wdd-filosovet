<?php

namespace App\Policies;

use App\Models\Supplier;
use App\Models\User;

class SupplierPolicy
{
    public function viewAny(User $u): bool
    {
        return $u->hasPermission('manage_suppliers');
    }

    public function view(User $u, Supplier $model): bool
    {
        return $u->hasPermission('manage_suppliers');
    }

    public function create(User $u): bool
    {
        return $u->hasPermission('manage_suppliers');
    }

    public function update(User $u, Supplier $model): bool
    {
        return $u->hasPermission('manage_suppliers');
    }
}
