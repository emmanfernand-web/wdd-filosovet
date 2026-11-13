<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'po_number' => $this->po_number, 'supplier_id' => $this->supplier_id, 'supplier' => $this->whenLoaded('supplier', fn () => $request->user()?->hasPermission('manage_suppliers') ? new SupplierResource($this->supplier) : ['id' => $this->supplier->id, 'name' => $this->supplier->name]), 'order_date' => $this->order_date->toDateString(), 'expected_delivery_date' => $this->expected_delivery_date?->toDateString(), 'status' => $this->status, 'notes' => $this->notes, 'created_by' => $this->created_by, 'subtotal' => $this->subtotal, 'total' => $this->total, 'items' => PurchaseOrderItemResource::collection($this->whenLoaded('items')), 'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String()];
    }
}
