<?php

namespace App\Http\Requests;

use App\Models\Pet;
use Illuminate\Support\Facades\Gate;

class ListPetsRequest extends PaginationRequest
{
    public function authorize(): bool
    {
        return Gate::allows('viewAny', [Pet::class, $this->route('customer')]);
    }
}
