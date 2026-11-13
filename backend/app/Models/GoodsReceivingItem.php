<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GoodsReceivingItem extends Model
{
    protected $guarded = ['*'];

    protected $attributes = [];

    protected function casts(): array
    {
        return ['quantity' => 'integer', 'actual_unit_price' => 'decimal:2', 'subtotal' => 'decimal:2'];
    }

    public function goodsReceiving(): BelongsTo
    {
        return $this->belongsTo(GoodsReceiving::class);
    }

    public function purchaseOrderItem(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrderItem::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(ProductBatch::class, 'product_batch_id');
    }

    public function movement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'stock_movement_id');
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Receiving history is immutable.'));
        static::deleting(fn () => throw new \LogicException('Receiving history cannot be deleted.'));
    }
}
