<?php

namespace App\Http\Requests;

use App\Models\Service;
use App\Support\ServiceBookingValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class SaveServiceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('service') ? Gate::allows('update', $this->route('service')) : Gate::allows('create', Service::class);
    }

    public function rules(): array
    {
        return ServiceBookingValidation::service($this->route('service'));
    }
}
