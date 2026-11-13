<?php

namespace App\Http\Requests;

use App\Models\PurchaseOrder;
use App\Support\PurchasingValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class SavePurchaseOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('purchaseOrder') ? Gate::allows('update', $this->route('purchaseOrder')) : Gate::allows('create', PurchaseOrder::class);
    }

    public function rules(): array
    {
        return PurchasingValidation::po($this->route('purchaseOrder') !== null);
    }
}
