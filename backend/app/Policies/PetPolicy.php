<?php

namespace App\Policies;

use App\Models\Customer;
use App\Models\Pet;
use App\Models\User;

class PetPolicy
{
    public function viewAny(User $user, Customer $customer): bool
    {
        return $this->manageForCustomer($user, $customer);
    }

    public function create(User $user, Customer $customer): bool
    {
        return $this->manageForCustomer($user, $customer);
    }

    public function view(User $user, Pet $pet): bool
    {
        return $this->manageForCustomer($user, $pet->customer);
    }

    public function update(User $user, Pet $pet): bool
    {
        return $this->manageForCustomer($user, $pet->customer);
    }

    public function delete(User $user, Pet $pet): bool
    {
        return $this->manageForCustomer($user, $pet->customer);
    }

    private function manageForCustomer(User $user, Customer $customer): bool
    {
        return $user->hasPermission('manage_pets')
            || ($customer->user_id === $user->id && $user->hasPermission('manage_own_pets'));
    }
}
