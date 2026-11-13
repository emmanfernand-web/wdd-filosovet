<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GoodsReceivingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'receiving_number' => $this->receiving_number, 'purchase_order_id' => $this->purchase_order_id, 'idempotency_key' => $this->idempotency_key, 'received_date' => $this->received_date->toDateString(), 'received_by' => $this->received_by, 'notes' => $this->notes, 'items' => GoodsReceivingItemResource::collection($this->whenLoaded('items')), 'created_at' => $this->created_at?->toIso8601String()];
    }
}
