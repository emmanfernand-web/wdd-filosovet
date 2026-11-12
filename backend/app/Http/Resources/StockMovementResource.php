<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'product_id' => $this->product_id, 'product_batch_id' => $this->product_batch_id,
            'movement_type' => $this->movement_type, 'direction' => $this->direction, 'quantity' => $this->quantity,
            'reason' => $this->reason, 'reference_type' => $this->reference_type, 'reference_id' => $this->reference_id,
            'performed_by' => $this->performed_by, 'created_at' => $this->created_at?->toIso8601String()];
    }
}
