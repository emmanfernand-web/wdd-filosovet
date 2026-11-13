<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'item_type' => $this->item_type, 'service_id' => $this->service_id, 'product_id' => $this->product_id, 'from_booking' => $this->from_booking, 'name' => $this->item_name, 'description' => $this->description, 'product_type' => $this->product_type, 'unit' => $this->unit, 'quantity' => $this->quantity, 'unit_price' => $this->unit_price, 'discount_amount' => '0.00', 'subtotal' => $this->subtotal,
            'allocations' => $this->whenLoaded('allocations', fn () => $this->allocations->map(fn ($a) => ['id' => $a->id, 'product_batch_id' => $a->product_batch_id, 'batch_number' => $a->batch?->batch_number, 'expiry_date' => $a->batch?->expiry_date?->toDateString(), 'quantity' => $a->quantity, 'stock_movement_id' => $a->stock_movement_id]))];
    }
}
