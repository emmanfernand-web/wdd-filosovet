<?php

namespace App\Http\Requests;

use App\Models\Customer;
use Illuminate\Support\Facades\Gate;

class ListCustomersRequest extends PaginationRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', Customer::class);
    }
}
