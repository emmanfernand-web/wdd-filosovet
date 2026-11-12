<?php

namespace App\Http\Requests;

use App\Models\Customer;
use App\Services\UserAccountService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StoreCustomerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('create', Customer::class);
    }

    public function rules(): array
    {
        return app(UserAccountService::class)->customerCreationRules();
    }
}
