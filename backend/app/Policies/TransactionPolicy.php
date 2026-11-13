<?php

namespace App\Policies;

use App\Models\Transaction;
use App\Models\User;

class TransactionPolicy
{
    public function viewAny(User $u): bool
    {
        return $this->staffRead($u) || $u->hasPermission('view_own_transactions');
    }

    public function create(User $u): bool
    {
        return $u->hasPermission('manage_transactions');
    }

    public function update(User $u, Transaction $t): bool
    {
        return $this->create($u);
    }

    public function transition(User $u, Transaction $t): bool
    {
        return $this->create($u);
    }

    public function view(User $u, Transaction $t): bool
    {
        return $this->staffRead($u) || ($u->hasPermission('view_own_transactions') && $t->customer()->where('user_id', $u->id)->exists());
    }

    public function pay(User $u, Transaction $t): bool
    {
        return $u->hasPermission('process_payments');
    }

    public function refund(User $u, Transaction $t): bool
    {
        return $u->hasPermission('manage_refunds');
    }

    public function staffRead(User $u): bool
    {
        return $u->hasPermission('view_transactions') || $u->hasPermission('manage_transactions') || $u->hasPermission('process_payments') || $u->hasPermission('manage_refunds');
    }
}
