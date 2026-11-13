<?php

namespace App\Http\Requests;

use App\Models\PurchaseOrder;
use App\Models\Supplier;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class PurchasingListRequest extends PaginationRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', $this->routeIs('purchasing.suppliers') ? Supplier::class : PurchaseOrder::class);
    }

    public function rules(): array
    {
        return parent::rules() + ['search' => ['sometimes', 'string', 'max:255'], 'is_active' => ['sometimes', 'boolean'], 'supplier_id' => ['sometimes', 'integer', 'exists:suppliers,id'], 'status' => ['sometimes', Rule::in(['draft', 'ordered', 'partially_received', 'fully_received', 'cancelled'])], 'from' => ['sometimes', 'date_format:Y-m-d'], 'to' => ['sometimes', 'date_format:Y-m-d', ...($this->has('from') ? ['after_or_equal:from'] : [])]];
    }
}
