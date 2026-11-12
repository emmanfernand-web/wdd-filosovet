<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Role;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserAccountService
{
    // Account creation foundation only: no session, token or authentication endpoint.
    public function registerCustomer(#[\SensitiveParameter] array $input): User
    {
        $data = Validator::make($input, $this->customerCreationRules())->validate();

        return DB::transaction(function () use ($data) {
            $role = Role::where('slug', 'customer')->firstOrFail();
            $user = User::create(Arr::only($data, ['name', 'email', 'password']));
            $user->customer()->create(Arr::only($data, ['phone', 'address']));
            $user->roles()->attach($role);

            return $user->refresh();
        });
    }

    /** @param array<int, int> $roleIds Explicit, privileged assignments; never read from public registration input. */
    public function createStaff(User $actor, #[\SensitiveParameter] array $input, array $roleIds): User
    {
        Gate::forUser($actor)->authorize('manage_users');
        Gate::forUser($actor)->authorize('manage_roles');
        $data = Validator::make($input, $this->accountRules() + $this->profileRules() + [
            'employee_number' => ['required', 'string', 'max:255', 'unique:staff_profiles,employee_number'],
            'hire_date' => ['nullable', 'date_format:Y-m-d'],
        ])->validate();
        Validator::make(['roles' => $roleIds], ['roles' => ['required', 'array', 'min:1']])->validate();

        return DB::transaction(function () use ($actor, $data, $roleIds) {
            $user = User::create(Arr::only($data, ['name', 'email', 'password']));
            $user->staffProfile()->create(Arr::only($data, ['employee_number', 'phone', 'address', 'hire_date']));
            app(AccessManagementService::class)->syncUserRoles($actor, $user, $roleIds);

            return $user->refresh();
        });
    }

    public function updateCustomerProfile(User $actor, Customer $customer, array $input): Customer
    {
        Gate::forUser($actor)->authorize('update', $customer);
        $data = Validator::make($input, $this->customerUpdateRules($customer))->validate();

        return DB::transaction(function () use ($actor, $customer, $data) {
            $user = $customer->user()->lockForUpdate()->firstOrFail();
            $user->fill(Arr::only($data, ['name', 'email']));
            if ($user->isDirty('email')) {
                // Customer management is not permission to alter another account's login identity.
                if ($actor->id !== $user->id) {
                    Gate::forUser($actor)->authorize('manage_users');
                }
                $user->email_verified_at = null;
            }
            $user->save();
            $customer->update(Arr::only($data, ['phone', 'address']));

            return $customer->refresh();
        });
    }

    public function customerCreationRules(): array
    {
        return $this->accountRules() + $this->profileRules();
    }

    public function customerUpdateRules(Customer $customer): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($customer->user_id)],
            'password' => ['missing'], 'password_confirmation' => ['missing'],
        ] + $this->profileRules() + $this->protectedRules();
    }

    private function accountRules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'confirmed', Password::min(12)->mixedCase()->numbers()->symbols()],
            'password_confirmation' => ['required', 'string'],
        ] + $this->protectedRules();
    }

    private function profileRules(): array
    {
        return [
            'phone' => ['nullable', 'string', 'max:30'],
            'address' => ['nullable', 'string', 'max:5000'],
        ];
    }

    private function protectedRules(): array
    {
        return array_fill_keys([
            'role', 'roles', 'role_id', 'role_ids', 'permission', 'permissions', 'permission_id', 'permission_ids',
            'is_active', 'email_verified_at', 'user_id',
        ], ['missing']);
    }
}
