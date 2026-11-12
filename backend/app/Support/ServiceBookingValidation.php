<?php

namespace App\Support;

use App\Models\Service;
use App\Models\ServiceCategory;
use Illuminate\Validation\Rule;

class ServiceBookingValidation
{
    public static function category(?ServiceCategory $category = null): array
    {
        $required = $category ? ['sometimes', 'required'] : ['required'];

        return ['name' => [...$required, 'string', 'max:255'], 'slug' => [...$required, 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('service_categories')->ignore($category?->id)],
            'description' => ['nullable', 'string', 'max:10000'], 'is_active' => ['sometimes', 'boolean']];
    }

    public static function service(?Service $service = null): array
    {
        $required = $service ? ['sometimes', 'required'] : ['required'];

        return ['service_category_id' => [...$required, 'integer', 'exists:service_categories,id'],
            'name' => [...$required, 'string', 'max:255'], 'slug' => [...$required, 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('services')->ignore($service?->id)],
            'description' => ['nullable', 'string', 'max:10000'], 'duration_minutes' => ['nullable', 'integer', 'min:1', 'max:525600'],
            'price' => [...$required, 'numeric', 'min:0', 'max:9999999999.99', 'decimal:0,2'], 'is_active' => ['sometimes', 'boolean']];
    }

    public static function booking(bool $update = false): array
    {
        $rules = ['scheduled_at' => [$update ? 'sometimes' : 'required', 'required', 'string', 'regex:/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/', 'date', 'after:now'],
            'customer_notes' => ['nullable', 'string', 'max:10000']];
        if (! $update) {
            $rules += ['pet_id' => ['required', 'integer', Rule::exists('pets', 'id')->whereNull('deleted_at')], 'service_id' => ['required', 'integer', 'exists:services,id']];
        }

        return $rules + array_fill_keys(array_merge(['customer_id', 'booking_code', 'status', 'staff_notes', 'created_by', 'price_snapshot', 'ends_at', 'id', 'created_at', 'updated_at'], $update ? ['pet_id', 'service_id'] : []), ['missing']);
    }
}
