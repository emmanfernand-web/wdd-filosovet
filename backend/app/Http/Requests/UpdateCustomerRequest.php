<?php

namespace App\Http\Requests;

use App\Models\Customer;
use App\Services\UserAccountService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdateCustomerRequest extends FormRequest
{
    public function targetCustomer(): Customer
    {
        return $this->route('customer') ?? $this->user()->customer ?? abort(404);
    }

    public function authorize(): bool
    {
        return Gate::allows('update', $this->targetCustomer());
    }

    public function rules(): array
    {
        return app(UserAccountService::class)->customerUpdateRules($this->targetCustomer());
    }
}
