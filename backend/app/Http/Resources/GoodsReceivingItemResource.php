<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GoodsReceivingItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'purchase_order_item_id' => $this->purchase_order_item_id, 'product_id' => $this->product_id, 'product_batch_id' => $this->product_batch_id, 'batch' => $this->whenLoaded('batch', fn () => $this->batch ? ['batch_number' => $this->batch->batch_number, 'expiry_date' => $this->batch->expiry_date->toDateString()] : null), 'quantity' => $this->quantity, 'actual_unit_price' => $this->actual_unit_price, 'subtotal' => $this->subtotal, 'stock_movement_id' => $this->stock_movement_id];
    }
}
