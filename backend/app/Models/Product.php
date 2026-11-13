<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['product_category_id', 'sku', 'name', 'type', 'description', 'unit', 'minimum_stock', 'is_active', 'selling_price'])]
class Product extends Model
{
    protected $attributes = ['is_active' => true, 'minimum_stock' => 0];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'minimum_stock' => 'integer', 'selling_price' => 'decimal:2'];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(ProductCategory::class, 'product_category_id');
    }

    public function batches(): HasMany
    {
        return $this->hasMany(ProductBatch::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }
}
