<?php

namespace App\Support;

class PurchasingValidation
{
    public static function quantity(): array
    {
        return ['integer', 'min:1', 'max:2147483647', static function (string $attribute, mixed $value, \Closure $fail) {
            if (is_bool($value)) {
                $fail('Integer quantity required.');
            }
        }];
    }

    public static function price(): array
    {
        return ['numeric', 'min:0', 'max:999999999.99', 'decimal:0,2'];
    }

    public static function supplier(bool $update = false): array
    {
        return ['name' => [$update ? 'sometimes' : 'required', 'required', 'string', 'max:255'], 'contact_name' => ['nullable', 'string', 'max:255'], 'email' => ['nullable', 'email', 'max:255'], 'phone' => ['nullable', 'string', 'max:50'], 'address' => ['nullable', 'string', 'max:10000'], 'notes' => ['nullable', 'string', 'max:10000'], 'is_active' => ['sometimes', 'boolean']] + self::missing(['id', 'created_at', 'updated_at']);
    }

    public static function po(bool $update = false): array
    {
        $r = $update ? 'sometimes' : 'required';

        return ['supplier_id' => [$r, 'required', 'integer', 'exists:suppliers,id'], 'order_date' => [$r, 'required', 'date_format:Y-m-d'], 'expected_delivery_date' => ['nullable', 'date_format:Y-m-d'], 'notes' => ['nullable', 'string', 'max:10000'],
            'items' => [$update ? 'sometimes' : 'present', 'array', 'list', 'max:100'], 'items.*' => ['array:product_id,quantity_ordered,unit_purchase_price'], 'items.*.product_id' => ['required', 'integer', 'distinct', 'exists:products,id'], 'items.*.quantity_ordered' => ['required', ...self::quantity()], 'items.*.unit_purchase_price' => ['required', ...self::price()]] + self::missing(['id', 'po_number', 'status', 'created_by', 'subtotal', 'total', 'created_at', 'updated_at']);
    }

    public static function receipt(): array
    {
        return ['idempotency_key' => ['required', 'uuid'], 'received_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'], 'notes' => ['nullable', 'string', 'max:10000'],
            'items' => ['required', 'array', 'list', 'min:1', 'max:100'], 'items.*' => ['array:purchase_order_item_id,quantity,batch_number,expiry_date,actual_unit_price'],
            'items.*.purchase_order_item_id' => ['required', 'integer', 'exists:purchase_order_items,id'], 'items.*.quantity' => ['required', ...self::quantity()],
            'items.*.batch_number' => ['nullable', 'string', 'max:100'], 'items.*.expiry_date' => ['nullable', 'date_format:Y-m-d'], 'items.*.actual_unit_price' => ['sometimes', 'required', ...self::price()]] + self::missing(['id', 'received_by', 'purchase_order_id', 'receiving_number', 'status', 'created_at', 'updated_at']);
    }

    private static function missing(array $fields): array
    {
        return array_fill_keys($fields, ['missing']);
    }
}
