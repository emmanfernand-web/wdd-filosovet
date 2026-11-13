<?php

namespace App\Support;

use App\Models\Product;
use App\Models\ProductCategory;
use Illuminate\Validation\Rule;

class InventoryValidation
{
    public const MAX_QUANTITY = 2147483647;

    private static function integerQuantity(int $minimum): array
    {
        return ['integer', 'min:'.$minimum, 'max:'.self::MAX_QUANTITY,
            static function (string $attribute, mixed $value, \Closure $fail): void {
                if (is_bool($value)) {
                    $fail('Quantity must be an integer, not a boolean.');
                }
            }];
    }

    public static function category(?ProductCategory $category = null): array
    {
        $required = $category ? ['sometimes', 'required'] : ['required'];

        return ['name' => [...$required, 'string', 'max:255'],
            'slug' => [...$required, 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('product_categories')->ignore($category?->id)],
            'description' => ['nullable', 'string', 'max:10000'], 'is_active' => ['sometimes', 'boolean']];
    }

    public static function product(?Product $product = null): array
    {
        $required = $product ? ['sometimes', 'required'] : ['required'];

        return ['product_category_id' => ['sometimes', 'nullable', 'integer', 'exists:product_categories,id'],
            'sku' => [...$required, 'string', 'max:100', Rule::unique('products')->ignore($product?->id)],
            'name' => [...$required, 'string', 'max:255'], 'type' => [...$required, Rule::in(['general', 'medicine'])],
            'description' => ['nullable', 'string', 'max:10000'], 'unit' => [...$required, 'string', 'max:50'],
            'selling_price' => ['sometimes', 'nullable', 'regex:/^(0|[1-9][0-9]{0,8})(?:\.[0-9]{1,2})?$/D'],
            'minimum_stock' => ['sometimes', ...self::integerQuantity(0)], 'is_active' => ['sometimes', 'boolean']]
            + array_fill_keys(['stock', 'quantity', 'balance', 'price', 'id', 'created_at', 'updated_at'], ['missing']);
    }

    public static function batch(Product $product): array
    {
        return ['batch_number' => ['required', 'string', 'max:100', Rule::unique('product_batches')->where('product_id', $product->id)],
            'expiry_date' => ['required', 'date_format:Y-m-d'], 'received_date' => ['nullable', 'date_format:Y-m-d', 'before_or_equal:today']]
            + array_fill_keys(['id', 'product_id', 'stock', 'quantity', 'created_at', 'updated_at'], ['missing']);
    }

    public static function movement(): array
    {
        return ['product_id' => ['required', 'integer', 'exists:products,id'],
            'product_batch_id' => ['nullable', 'integer', 'exists:product_batches,id'],
            'movement_type' => ['required', Rule::in(['opening_stock', 'adjustment_in', 'adjustment_out'])],
            'quantity' => ['required', ...self::integerQuantity(1)],
            'reason' => ['required', 'string', 'max:10000', 'regex:/\\S/u']]
            + array_fill_keys(['id', 'direction', 'performed_by', 'reference_type', 'reference_id', 'created_at', 'updated_at'], ['missing']);
    }
}
