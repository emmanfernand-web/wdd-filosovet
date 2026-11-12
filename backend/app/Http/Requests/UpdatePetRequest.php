<?php

namespace App\Http\Requests;

use App\Support\PetValidation;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;

class UpdatePetRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        $this->replace(PetValidation::normalize($this->all()));
    }

    public function authorize(): bool
    {
        return Gate::allows('update', $this->route('pet'));
    }

    public function rules(): array
    {
        return PetValidation::rules($this->route('pet'));
    }
}
