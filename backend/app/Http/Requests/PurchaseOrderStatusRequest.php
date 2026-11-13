<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class PurchaseOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('update', $this->route('purchaseOrder'));
    }

    public function rules(): array
    {
        return ['status' => ['required', Rule::in(['ordered', 'cancelled'])]];
    }
}
