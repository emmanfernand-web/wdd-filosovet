<?php

namespace App\Http\Requests;

use App\Models\Product;
use App\Support\InventoryValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class SaveProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('product') ? Gate::allows('update', $this->route('product')) : Gate::allows('create', Product::class);
    }

    public function rules(): array
    {
        return InventoryValidation::product($this->route('product'));
    }
}
