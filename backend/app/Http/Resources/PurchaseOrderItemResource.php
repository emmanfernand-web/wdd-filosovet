<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseOrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'product_id' => $this->product_id, 'product_name' => $this->product_name, 'product_type' => $this->product_type, 'unit' => $this->unit, 'quantity_ordered' => $this->quantity_ordered, 'unit_purchase_price' => $this->unit_purchase_price, 'subtotal' => $this->subtotal, 'quantity_received' => (int) $this->receivingItems->sum('quantity'), 'remaining_quantity' => $this->quantity_ordered - (int) $this->receivingItems->sum('quantity')];
    }
}
