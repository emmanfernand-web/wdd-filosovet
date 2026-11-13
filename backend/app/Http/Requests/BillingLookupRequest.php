<?php

namespace App\Http\Requests;

use App\Support\TransactionValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class BillingLookupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manage_transactions') || ($this->route('kind') === 'payment-methods' && Gate::allows('process_payments'));
    }

    public function rules(): array
    {
        return TransactionValidation::listing();
    }

    public function perPage(): int
    {
        return (int) $this->validated('per_page', 20);
    }
}
