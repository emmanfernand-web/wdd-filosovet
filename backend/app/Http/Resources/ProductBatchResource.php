<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductBatchResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'product_id' => $this->product_id, 'batch_number' => $this->batch_number,
            'expiry_date' => $this->expiry_date->toDateString(), 'received_date' => $this->received_date?->toDateString(),
            'physical_stock' => $this->whenHas('physical_stock', fn () => (int) $this->physical_stock),
            'usable_stock' => $this->whenHas('usable_stock', fn () => (int) $this->usable_stock),
            'expired_stock' => $this->whenHas('expired_stock', fn () => (int) $this->expired_stock)];
    }
}
