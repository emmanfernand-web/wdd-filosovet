<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AccessControlSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $permissions = collect(config('access.permissions'))->mapWithKeys(function (string $description, string $slug) {
                $permission = Permission::firstOrCreate(['slug' => $slug], [
                    'name' => ucwords(str_replace('_', ' ', $slug)),
                    'description' => $description,
                ]);

                return [$slug => $permission->id];
            });

            foreach (config('access.roles') as $slug => $definition) {
                $role = Role::firstOrCreate(['slug' => $slug], [
                    'name' => $definition['name'], 'description' => $definition['description'],
                ]);
                // Seed initial grants only; reruns must not undo an administrator's revocations.
                if (! $role->wasRecentlyCreated) {
                    continue;
                }

                $slugs = $definition['permissions'] === ['*'] ? $permissions->keys()->all() : $definition['permissions'];
                $role->permissions()->syncWithoutDetaching($permissions->only($slugs)->values()->all());
            }
        });
    }
}
