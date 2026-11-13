<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PurchasingListRequest;
use App\Http\Requests\SaveSupplierRequest;
use App\Http\Resources\SupplierResource;
use App\Models\Supplier;
use App\Services\SupplierService;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(PurchasingListRequest $r, SupplierService $s)
    {
        return SupplierResource::collection($s->listing($r->user(), $r->validated(), $r->perPage()));
    }

    public function show(Request $r, Supplier $supplier, SupplierService $s)
    {
        return new SupplierResource($s->show($r->user(), $supplier));
    }

    public function store(SaveSupplierRequest $r, SupplierService $s)
    {
        return (new SupplierResource($s->save($r->user(), $r->validated())))->response()->setStatusCode(201);
    }

    public function update(SaveSupplierRequest $r, Supplier $supplier, SupplierService $s)
    {
        return new SupplierResource($s->save($r->user(), $r->validated(), $supplier));
    }
}
