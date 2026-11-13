<?php

namespace App\Http\Requests;

use App\Support\TransactionValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StorePaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('pay', $this->route('transaction'));
    }

    public function rules(): array
    {
        return TransactionValidation::payment();
    }

    public function perPage(): int
    {
        return (int) $this->validated('per_page', 20);
    }
}
