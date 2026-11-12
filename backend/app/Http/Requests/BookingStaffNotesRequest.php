<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class BookingStaffNotesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('staffNotes', $this->route('booking'));
    }

    public function rules(): array
    {
        return ['staff_notes' => ['present', 'nullable', 'string', 'max:10000']];
    }
}
