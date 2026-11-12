<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InventoryBalanceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'sku' => $this->sku, 'name' => $this->name, 'type' => $this->type, 'unit' => $this->unit,
            'is_active' => $this->is_active, 'minimum_stock' => $this->minimum_stock, 'physical_stock' => (int) $this->physical_stock,
            'usable_stock' => (int) $this->usable_stock, 'expired_stock' => (int) $this->expired_stock, 'is_low_stock' => $this->usable_stock < $this->minimum_stock];
    }
}
