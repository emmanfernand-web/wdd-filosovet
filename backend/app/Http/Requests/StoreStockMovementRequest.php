<?php

namespace App\Http\Requests;

use App\Models\StockMovement;
use App\Support\InventoryValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreStockMovementRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('create', StockMovement::class);
    }

    public function rules(): array
    {
        return InventoryValidation::movement();
    }
}
