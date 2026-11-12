<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ListCustomersRequest;
use App\Http\Requests\StoreCustomerRequest;
use App\Http\Requests\UpdateCustomerRequest;
use App\Http\Resources\CustomerResource;
use App\Models\Customer;
use App\Services\CustomerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CustomerController extends Controller
{
    public function __construct(private CustomerService $customers) {}

    public function me(Request $request): CustomerResource
    {
        return new CustomerResource($this->customers->own($request->user()));
    }

    public function index(ListCustomersRequest $request): AnonymousResourceCollection
    {
        return CustomerResource::collection($this->customers->listing($request->user(), $request->perPage()));
    }

    public function store(StoreCustomerRequest $request): JsonResponse
    {
        return (new CustomerResource($this->customers->create($request->user(), $request->validated())))
            ->response()->setStatusCode(201);
    }

    public function show(Request $request, Customer $customer): CustomerResource
    {
        return new CustomerResource($this->customers->show($request->user(), $customer));
    }

    public function update(UpdateCustomerRequest $request): CustomerResource
    {
        return new CustomerResource($this->customers->update($request->user(), $request->targetCustomer(), $request->validated()));
    }
}
