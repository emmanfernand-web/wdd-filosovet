<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GoodsReceiving extends Model
{
    protected $guarded = ['*'];

    protected $attributes = [];

    protected function casts(): array
    {
        return ['received_date' => 'immutable_date'];
    }

    public function purchaseOrder(): BelongsTo
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(GoodsReceivingItem::class);
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Receiving history is immutable.'));
        static::deleting(fn () => throw new \LogicException('Receiving history cannot be deleted.'));
    }
}
