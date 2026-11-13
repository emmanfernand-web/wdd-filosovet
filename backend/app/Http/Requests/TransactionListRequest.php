<?php

namespace App\Http\Requests;

use App\Models\Transaction;
use App\Support\TransactionValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class TransactionListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Transaction::class);
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
