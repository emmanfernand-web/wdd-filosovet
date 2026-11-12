<?php

namespace App\Http\Requests;

use App\Models\Pet;
use App\Support\PetValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class StorePetRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->replace(PetValidation::normalize($this->all()));
    }

    public function authorize(): bool
    {
        return Gate::allows('create', [Pet::class, $this->route('customer')]);
    }

    public function rules(): array
    {
        return PetValidation::rules();
    }
}
