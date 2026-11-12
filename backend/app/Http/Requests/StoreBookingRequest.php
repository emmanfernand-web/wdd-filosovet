<?php

namespace App\Http\Requests;

use App\Models\Booking;
use App\Support\ServiceBookingValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreBookingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('create', Booking::class);
    }

    public function rules(): array
    {
        return ServiceBookingValidation::booking();
    }
}
