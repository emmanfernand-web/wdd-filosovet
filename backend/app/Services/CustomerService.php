<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\Gate;

class CustomerService
{
    public function __construct(private UserAccountService $accounts) {}

    public function own(User $actor): Customer
    {
        return $this->show($actor, $actor->customer()->with('user')->firstOrFail());
    }

    public function listing(User $actor, int $perPage = 20): LengthAwarePaginator
    {
        Gate::forUser($actor)->authorize('viewAny', Customer::class);

        return Customer::with('user')->orderBy('id')->paginate(min(max($perPage, 1), 100));
    }

    public function show(User $actor, Customer $customer): Customer
    {
        Gate::forUser($actor)->authorize('view', $customer);

        return $customer->loadMissing('user');
    }

    public function create(User $actor, #[\SensitiveParameter] array $input): Customer
    {
        Gate::forUser($actor)->authorize('create', Customer::class);

        return $this->accounts->registerCustomer($input)->customer->load('user');
    }

    public function update(User $actor, Customer $customer, array $input): Customer
    {
        return $this->accounts->updateCustomerProfile($actor, $customer, $input)->load('user');
    }
}
