<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TransactionItem extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return ['quantity' => 'integer', 'from_booking' => 'boolean', 'unit_price' => 'decimal:2', 'subtotal' => 'decimal:2'];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'transaction_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class, 'service_id');
    }

    public function allocations(): HasMany
    {
        return $this->hasMany(TransactionStockAllocation::class, 'transaction_item_id');
    }

    protected static function booted(): void
    {
        $guard = function (self $row) {
            if ($row->transaction()->value('status') !== 'draft') {
                throw new \LogicException('Confirmed items are immutable.');
            }
        };
        static::creating($guard);
        static::updating(function (self $row) use ($guard) {
            if ($row->isDirty('transaction_id')) {
                throw new \LogicException('Item parent is immutable.');
            } $guard($row);
        });
        static::deleting($guard);
    }
}
