<?php

namespace App\Support;

use App\Models\Pet;
use Illuminate\Validation\Rule;

class PetValidation
{
    public static function rules(?Pet $pet = null): array
    {
        $required = $pet ? ['sometimes', 'required'] : ['required'];

        return [
            'name' => [...$required, 'string', 'max:255'],
            // Species is intentionally open text, supporting exotic pets and scientific names.
            'species' => [...$required, 'string', 'max:100'],
            'breed' => ['nullable', 'string', 'max:255'],
            'gender' => ['nullable', Rule::in(['male', 'female', 'intersex', 'unknown'])],
            'date_of_birth' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today'],
            'weight' => ['nullable', 'numeric', 'gt:0', 'max:10000', 'decimal:0,3'],
            'color' => ['nullable', 'string', 'max:100'],
            'microchip_number' => ['nullable', 'string', 'max:100', Rule::unique('pets', 'microchip_number')->ignore($pet?->id)],
            'notes' => ['nullable', 'string', 'max:10000'],
            'customer_id' => ['missing'], 'user_id' => ['missing'], 'id' => ['missing'],
            'deleted_at' => ['missing'], 'created_at' => ['missing'], 'updated_at' => ['missing'],
        ];
    }

    public static function normalize(array $input): array
    {
        if (isset($input['microchip_number']) && is_string($input['microchip_number'])) {
            $chip = trim($input['microchip_number']);
            $input['microchip_number'] = $chip === '' ? null : $chip;
        }

        return $input;
    }
}
