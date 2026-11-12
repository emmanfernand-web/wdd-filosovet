<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'product_category_id' => $this->product_category_id, 'sku' => $this->sku, 'name' => $this->name,
            'type' => $this->type, 'unit' => $this->unit, 'description' => $this->description, 'minimum_stock' => $this->minimum_stock, 'is_active' => $this->is_active,
            'category' => new ProductCategoryResource($this->whenLoaded('category'))];
    }
}
