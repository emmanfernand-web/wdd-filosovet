<?php

namespace App\Http\Requests;

use App\Models\ProductCategory;
use App\Support\InventoryValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class SaveProductCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('category') ? Gate::allows('update', $this->route('category')) : Gate::allows('create', ProductCategory::class);
    }

    public function rules(): array
    {
        return InventoryValidation::category($this->route('category'));
    }
}
