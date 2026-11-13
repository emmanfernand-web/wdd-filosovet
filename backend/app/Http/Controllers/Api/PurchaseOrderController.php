<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PurchaseOrderStatusRequest;
use App\Http\Requests\PurchasingListRequest;
use App\Http\Requests\SavePurchaseOrderRequest;
use App\Http\Resources\PurchaseOrderResource;
use App\Models\PurchaseOrder;
use App\Services\PurchaseOrderService;
use Illuminate\Http\Request;

class PurchaseOrderController extends Controller
{
    public function index(PurchasingListRequest $r, PurchaseOrderService $s)
    {
        return PurchaseOrderResource::collection($s->listing($r->user(), $r->validated(), $r->perPage()));
    }

    public function show(Request $r, PurchaseOrder $purchaseOrder, PurchaseOrderService $s)
    {
        return new PurchaseOrderResource($s->show($r->user(), $purchaseOrder));
    }

    public function store(SavePurchaseOrderRequest $r, PurchaseOrderService $s)
    {
        return (new PurchaseOrderResource($s->save($r->user(), $r->validated())))->response()->setStatusCode(201);
    }

    public function update(SavePurchaseOrderRequest $r, PurchaseOrder $purchaseOrder, PurchaseOrderService $s)
    {
        return new PurchaseOrderResource($s->save($r->user(), $r->validated(), $purchaseOrder));
    }

    public function status(PurchaseOrderStatusRequest $r, PurchaseOrder $purchaseOrder, PurchaseOrderService $s)
    {
        return new PurchaseOrderResource($s->transition($r->user(), $purchaseOrder, $r->validated()['status']));
    }
}
