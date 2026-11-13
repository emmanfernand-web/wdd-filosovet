<?php

namespace App\Support;

use Illuminate\Validation\Rule;

class TransactionValidation
{
    public static function money(): array
    {
        return ['regex:/^(0|[1-9][0-9]{0,15})(?:\.[0-9]{1,2})?$/D'];
    }

    public static function draft(bool $updating = false): array
    {
        return ['customer_id' => $updating ? ['missing'] : ['required', 'integer', 'exists:customers,id'],
            'booking_id' => $updating ? ['missing'] : ['nullable', 'integer', 'exists:bookings,id'],
            'transaction_date' => [$updating ? 'sometimes' : 'required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'items' => [$updating ? 'sometimes' : 'present', 'array', 'list', 'max:100'],
            'items.*' => ['required', 'array:item_type,service_id,product_id,quantity'],
            'items.*.item_type' => ['required', Rule::in(['service', 'product'])],
            'items.*.service_id' => ['nullable', 'integer', 'exists:services,id'],
            'items.*.product_id' => ['nullable', 'integer', 'exists:products,id'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:2147483647', function ($a, $v, $f) {
                if (is_bool($v)) {
                    $f('Quantity must be integer.');
                }
            }]]
            + array_fill_keys(['id', 'status', 'subtotal', 'discount_amount', 'tax_amount', 'grand_total', 'total_paid', 'remaining_balance', 'created_by', 'active_booking_id', 'created_at', 'updated_at', 'payment_status', 'currency'], ['missing']);
    }

    public static function payment(): array
    {
        return ['idempotency_key' => ['required', 'uuid'], 'payment_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'amount' => ['required', ...self::money()], 'method' => ['required', 'string', 'max:50'], 'status' => ['required', Rule::in(['succeeded', 'failed', 'cancelled'])],
            'reference_number' => ['nullable', 'string', 'max:255'], 'notes' => ['nullable', 'string', 'max:10000']]
            + array_fill_keys(['id', 'received_by', 'transaction_id', 'payment_number', 'payload_hash', 'created_at', 'updated_at', 'payment_method_id'], ['missing']);
    }

    public static function refund(): array
    {
        return ['idempotency_key' => ['required', 'uuid'], 'refund_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'amount' => ['required', ...self::money()], 'reason' => ['required', 'string', 'max:10000', 'regex:/\S/u']]
            + array_fill_keys(['id', 'payment_id', 'transaction_id', 'refunded_by', 'refund_number', 'payload_hash', 'created_at', 'updated_at'], ['missing']);
    }

    public static function listing(): array
    {
        return ['per_page' => ['sometimes', 'integer', 'min:1', 'max:100'], 'page' => ['sometimes', 'integer', 'min:1'],
            'search' => ['sometimes', 'string', 'max:255'], 'customer_id' => ['sometimes', 'integer', 'min:1'],
            'status' => ['sometimes', Rule::in(['draft', 'confirmed', 'completed', 'cancelled'])],
            'from' => ['sometimes', 'date_format:Y-m-d'], 'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from']];
    }
}
