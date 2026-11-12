<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ServiceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'service_category_id' => $this->service_category_id, 'name' => $this->name, 'slug' => $this->slug,
            'description' => $this->description, 'duration_minutes' => $this->duration_minutes, 'price' => $this->price, 'is_active' => $this->is_active,
            'category' => new ServiceCategoryResource($this->whenLoaded('category'))];
    }
}
