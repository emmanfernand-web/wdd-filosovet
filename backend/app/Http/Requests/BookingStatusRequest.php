<?php

namespace App\Http\Requests;

use App\Enums\BookingStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class BookingStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('transition', $this->route('booking'));
    }

    public function rules(): array
    {
        return ['status' => ['required', Rule::enum(BookingStatus::class)]];
    }
}
