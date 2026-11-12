<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

abstract class PaginationRequest extends FormRequest
{
    public function rules(): array
    {
        return ['per_page' => ['sometimes', 'integer', 'min:1', 'max:100'], 'page' => ['sometimes', 'integer', 'min:1']];
    }

    public function perPage(): int
    {
        return (int) ($this->validated()['per_page'] ?? 20);
    }
}
