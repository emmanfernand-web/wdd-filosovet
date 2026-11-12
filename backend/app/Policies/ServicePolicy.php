<?php

namespace App\Policies;

use App\Models\Service;
use App\Models\User;

class ServicePolicy
{
    public function view(?User $user, Service $service): bool
    {
        return ($service->is_active && $service->category->is_active) || ($user?->hasPermission('manage_services') ?? false);
    }

    public function create(User $user): bool
    {
        return $user->hasPermission('manage_services');
    }

    public function update(User $user, Service $service): bool
    {
        return $user->hasPermission('manage_services');
    }
}
