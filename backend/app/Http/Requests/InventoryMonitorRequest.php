<?php

namespace App\Http\Requests;

use App\Models\ProductBatch;
use App\Models\StockMovement;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class InventoryMonitorRequest extends PaginationRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', $this->routeIs('inventory.movements') ? StockMovement::class : ProductBatch::class);
    }

    public function rules(): array
    {
        return parent::rules() + ['product_id' => ['sometimes', 'integer', 'exists:products,id'], 'product_batch_id' => ['sometimes', 'integer', 'exists:product_batches,id'],
            'product_category_id' => ['sometimes', 'integer', 'exists:product_categories,id'], 'type' => ['sometimes', Rule::in(['general', 'medicine'])], 'is_active' => ['sometimes', 'boolean'],
            'movement_type' => ['sometimes', Rule::in(['opening_stock', 'adjustment_in', 'adjustment_out'])],
            'from' => ['sometimes', 'date_format:Y-m-d'], 'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from']];
    }
}
