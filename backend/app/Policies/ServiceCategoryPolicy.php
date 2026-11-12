<?php

namespace App\Policies;

use App\Models\ServiceCategory;
use App\Models\User;

class ServiceCategoryPolicy
{
    public function view(?User $user, ServiceCategory $category): bool
    {
        return $category->is_active || ($user?->hasPermission('manage_services') ?? false);
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('manage_services');
    }

    public function update(User $user, ServiceCategory $category): bool
    {
        return $user->hasPermission('manage_services');
    }
}
