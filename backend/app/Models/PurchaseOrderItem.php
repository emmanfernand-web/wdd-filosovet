<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PurchaseOrderItem extends Model
{
    protected $guarded = ['*'];

    protected $attributes = [];

    protected function casts(): array
    {
        return ['quantity_ordered' => 'integer', 'unit_purchase_price' => 'decimal:2', 'subtotal' => 'decimal:2'];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function receivingItems(): HasMany
    {
        return $this->hasMany(GoodsReceivingItem::class);
    }
}
