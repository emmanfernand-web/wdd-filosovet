<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStockMovementRequest;
use App\Http\Resources\StockMovementResource;
use App\Services\InventoryService;

class StockMovementController extends Controller
{
    public function store(StoreStockMovementRequest $request, InventoryService $inventory)
    {
        return (new StockMovementResource($inventory->record($request->user(), $request->validated())))->response()->setStatusCode(201);
    }
}
