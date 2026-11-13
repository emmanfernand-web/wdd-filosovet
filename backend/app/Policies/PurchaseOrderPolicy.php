<?php

namespace App\Policies;

use App\Models\PurchaseOrder;
use App\Models\User;

class PurchaseOrderPolicy
{
    public function viewAny(User $u): bool
    {
        return $u->hasPermission('manage_purchase_orders') || $u->hasPermission('receive_purchase_orders');
    }

    public function view(User $u, PurchaseOrder $model): bool
    {
        return $u->hasPermission('manage_purchase_orders') || $u->hasPermission('receive_purchase_orders');
    }

    public function create(User $u): bool
    {
        return $u->hasPermission('manage_purchase_orders');
    }

    public function update(User $u, PurchaseOrder $model): bool
    {
        return $u->hasPermission('manage_purchase_orders');
    }

    public function receive(User $u, PurchaseOrder $model): bool
    {
        return $u->hasPermission('receive_purchase_orders');
    }
}
