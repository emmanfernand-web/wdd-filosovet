<?php

namespace App\Policies;

use App\Models\StaffProfile;
use App\Models\User;

class StaffProfilePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermission('manage_users');
    }

    public function view(User $user, StaffProfile $profile): bool
    {
        return $user->hasPermission('manage_users')
            || ($profile->user_id === $user->id && $user->hasPermission('view_own_profile'));
    }

    public function update(User $user, StaffProfile $profile): bool
    {
        // Employee identifiers and employment data are managed by administrators.
        return $user->hasPermission('manage_users');
    }
}
