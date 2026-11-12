<?php

namespace App\Http\Requests;

use Illuminate\Support\Facades\Gate;

class CatalogListRequest extends PaginationRequest
{
    public function authorize(): bool
    {
        return ! $this->has('is_active') || Gate::allows('manage_services');
    }

    public function rules(): array
    {
        return parent::rules() + ['is_active' => ['sometimes', 'boolean'], 'service_category_id' => ['sometimes', 'integer', 'exists:service_categories,id']];
    }
}
