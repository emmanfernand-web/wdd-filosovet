<?php

namespace App\Http\Requests;

use App\Models\ServiceCategory;
use App\Support\ServiceBookingValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class SaveServiceCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('category') ? Gate::allows('update', $this->route('category')) : Gate::allows('create', ServiceCategory::class);
    }

    public function rules(): array
    {
        return ServiceBookingValidation::category($this->route('category'));
    }
}
