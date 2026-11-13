<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class TransactionStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('transition', $this->route('transaction'));
    }

    public function rules(): array
    {
        return ['status' => ['required', Rule::in(['confirmed', 'completed', 'cancelled'])]];
    }

    public function perPage(): int
    {
        return (int) $this->validated('per_page', 20);
    }
}
