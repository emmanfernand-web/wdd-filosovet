<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\Pet;
use App\Models\User;
use App\Support\PetValidation;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;

class PetService
{
    public function listing(User $actor, Customer $customer, int $perPage = 20): LengthAwarePaginator
    {
        Gate::forUser($actor)->authorize('viewAny', [Pet::class, $customer]);

        return $customer->pets()->orderBy('id')->paginate(min(max($perPage, 1), 100));
    }

    public function show(User $actor, Pet $pet): Pet
    {
        Gate::forUser($actor)->authorize('view', $pet);

        return $pet;
    }

    public function create(User $actor, Customer $customer, array $input): Pet
    {
        Gate::forUser($actor)->authorize('create', [Pet::class, $customer]);
        $data = Validator::make(PetValidation::normalize($input), PetValidation::rules())->validate();

        return $customer->pets()->create($data);
    }

    public function update(User $actor, Pet $pet, array $input): Pet
    {
        Gate::forUser($actor)->authorize('update', $pet);
        $data = Validator::make(PetValidation::normalize($input), PetValidation::rules($pet))->validate();
        $pet->update($data);

        return $pet->refresh();
    }

    public function delete(User $actor, Pet $pet): void
    {
        Gate::forUser($actor)->authorize('delete', $pet);
        $pet->delete();
    }
}
