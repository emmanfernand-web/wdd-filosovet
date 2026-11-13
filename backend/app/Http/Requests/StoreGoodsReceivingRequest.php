<?php

namespace App\Http\Requests;

use App\Support\PurchasingValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreGoodsReceivingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('receive', $this->route('purchaseOrder'));
    }

    public function rules(): array
    {
        return PurchasingValidation::receipt();
    }
}
