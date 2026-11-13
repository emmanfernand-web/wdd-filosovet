<?php

namespace App\Http\Requests;

use App\Support\TransactionValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StorePaymentRefundRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('refund', $this->route('payment')->transaction);
    }

    public function rules(): array
    {
        return TransactionValidation::refund();
    }

    public function perPage(): int
    {
        return (int) $this->validated('per_page', 20);
    }
}
