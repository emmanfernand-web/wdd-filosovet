<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ListPetsRequest;
use App\Http\Requests\StorePetRequest;
use App\Http\Requests\UpdatePetRequest;
use App\Http\Resources\PetResource;
use App\Models\Customer;
use App\Models\Pet;
use App\Services\PetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PetController extends Controller
{
    public function __construct(private PetService $pets) {}

    public function index(ListPetsRequest $request, Customer $customer): AnonymousResourceCollection
    {
        return PetResource::collection($this->pets->listing($request->user(), $customer, $request->perPage()));
    }

    public function store(StorePetRequest $request, Customer $customer): JsonResponse
    {
        return (new PetResource($this->pets->create($request->user(), $customer, $request->validated())))
            ->response()->setStatusCode(201);
    }

    public function show(Request $request, Pet $pet): PetResource
    {
        return new PetResource($this->pets->show($request->user(), $pet));
    }

    public function update(UpdatePetRequest $request, Pet $pet): PetResource
    {
        return new PetResource($this->pets->update($request->user(), $pet, $request->validated()));
    }

    public function destroy(Request $request, Pet $pet): Response
    {
        $this->pets->delete($request->user(), $pet);

        return response()->noContent();
    }
}
