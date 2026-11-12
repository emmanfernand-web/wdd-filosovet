<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\InventoryMonitorRequest;
use App\Http\Resources\InventoryBalanceResource;
use App\Http\Resources\ProductBatchResource;
use App\Http\Resources\StockMovementResource;
use App\Services\InventoryQueryService;

class InventoryController extends Controller
{
    public function balances(InventoryMonitorRequest $request, InventoryQueryService $inventory)
    {
        return InventoryBalanceResource::collection($inventory->balances($request->user(), $request->validated(), $request->perPage()));
    }

    public function lowStock(InventoryMonitorRequest $request, InventoryQueryService $inventory)
    {
        return InventoryBalanceResource::collection($inventory->balances($request->user(), $request->validated(), $request->perPage(), true));
    }

    public function expiredBatches(InventoryMonitorRequest $request, InventoryQueryService $inventory)
    {
        return ProductBatchResource::collection($inventory->expiredBatches($request->user(), $request->validated(), $request->perPage()));
    }

    public function movements(InventoryMonitorRequest $request, InventoryQueryService $inventory)
    {
        return StockMovementResource::collection($inventory->movements($request->user(), $request->validated(), $request->perPage()));
    }
}
