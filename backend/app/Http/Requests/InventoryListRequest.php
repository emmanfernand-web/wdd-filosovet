<?php

namespace App\Http\Requests;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\ProductCategory;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class InventoryListRequest extends PaginationRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', $this->routeIs('inventory.categories') ? ProductCategory::class : ($this->routeIs('inventory.batches') ? ProductBatch::class : Product::class));
    }

    public function rules(): array
    {
        return parent::rules() + ['type' => ['sometimes', Rule::in(['medicine', 'general'])], 'is_active' => ['sometimes', 'boolean'],
            'usable_only' => ['sometimes', 'boolean'], 'product_category_id' => ['sometimes', 'integer', 'exists:product_categories,id']];
    }
}
