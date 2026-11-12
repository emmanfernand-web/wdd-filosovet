<?php

namespace App\Services;

use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;

class AccessManagementService
{
    /** @param array<int, int> $roleIds */
    public function syncUserRoles(User $actor, User $user, array $roleIds): void
    {
        Gate::forUser($actor)->authorize('manage_roles');
        $ids = $this->validatedIds($roleIds, 'roles');

        DB::transaction(function () use ($user, $ids) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $user->roles()->sync($ids);
        });
        $user->unsetRelation('roles');
    }

    /** @param array<int, int> $permissionIds */
    public function syncRolePermissions(User $actor, Role $role, array $permissionIds): void
    {
        Gate::forUser($actor)->authorize('manage_permissions');
        $ids = $this->validatedIds($permissionIds, 'permissions');

        DB::transaction(function () use ($role, $ids) {
            Role::whereKey($role->id)->lockForUpdate()->firstOrFail();
            $role->permissions()->sync($ids);
        });
        $role->unsetRelation('permissions');
    }

    public function setUserActive(User $actor, User $user, bool $active): void
    {
        Gate::forUser($actor)->authorize('manage_users');
        $user->forceFill(['is_active' => $active])->save();
    }

    private function validatedIds(array $ids, string $table): array
    {
        return Validator::make(['ids' => $ids], [
            'ids' => ['present', 'array', 'list'],
            'ids.*' => ['required', 'integer', 'distinct', 'exists:'.$table.',id'],
        ])->validate()['ids'];
    }
}
