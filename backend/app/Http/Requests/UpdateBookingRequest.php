<?php

namespace App\Http\Requests;

use App\Support\ServiceBookingValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdateBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('update', $this->route('booking'));
    }

    public function rules(): array
    {
        return ServiceBookingValidation::booking(true);
    }
}
