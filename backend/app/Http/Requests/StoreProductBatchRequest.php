<?php

namespace App\Http\Requests;

use App\Models\ProductBatch;
use App\Support\InventoryValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreProductBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('create', ProductBatch::class);
    }

    public function rules(): array
    {
        return InventoryValidation::batch($this->route('product'));
    }
}
