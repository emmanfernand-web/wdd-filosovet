<?php

namespace App\Http\Requests;

use App\Models\Supplier;
use App\Support\PurchasingValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class SaveSupplierRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('supplier') ? Gate::allows('update', $this->route('supplier')) : Gate::allows('create', Supplier::class);
    }

    public function rules(): array
    {
        return PurchasingValidation::supplier($this->route('supplier') !== null);
    }
}
