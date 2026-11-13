<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PurchasingListRequest;
use App\Http\Requests\StoreGoodsReceivingRequest;
use App\Http\Resources\GoodsReceivingResource;
use App\Models\GoodsReceiving;
use App\Models\PurchaseOrder;
use App\Services\GoodsReceivingService;
use Illuminate\Http\Request;

class GoodsReceivingController extends Controller
{
    public function index(PurchasingListRequest $r, PurchaseOrder $purchaseOrder, GoodsReceivingService $s)
    {
        return GoodsReceivingResource::collection($s->listing($r->user(), $purchaseOrder, $r->perPage()));
    }

    public function show(Request $r, GoodsReceiving $receiving, GoodsReceivingService $s)
    {
        return new GoodsReceivingResource($s->show($r->user(), $receiving));
    }

    public function store(StoreGoodsReceivingRequest $r, PurchaseOrder $purchaseOrder, GoodsReceivingService $s)
    {
        [$receipt,$created] = $s->confirm($r->user(), $purchaseOrder, $r->validated());

        return (new GoodsReceivingResource($receipt))->response()->setStatusCode($created ? 201 : 200);
    }
}
