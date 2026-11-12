<?php

namespace App\Policies;

use App\Models\Customer;
use App\Models\User;

class CustomerPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('manage_customers');
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('manage_customers');
    }

    public function view(User $user, Customer $customer): bool
    {
        return $user->hasPermission('manage_customers')
            || ($customer->user_id === $user->id && $user->hasPermission('view_own_profile'));
    }

    public function update(User $user, Customer $customer): bool
    {
        return $user->hasPermission('manage_customers')
            || ($customer->user_id === $user->id && $user->hasPermission('update_own_profile'));
    }
}
