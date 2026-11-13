<?php

namespace App\Http\Requests;

use App\Models\Transaction;
use App\Support\TransactionValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class SaveTransactionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('transaction') ? Gate::allows('update', $this->route('transaction')) : Gate::allows('create', Transaction::class);
    }

    public function rules(): array
    {
        return TransactionValidation::draft($this->route('transaction') !== null);
    }

    public function perPage(): int
    {
        return (int) $this->validated('per_page', 20);
    }
}
