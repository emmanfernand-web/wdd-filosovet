<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PaymentRefund extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'refund_date' => 'immutable_date'];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new \LogicException('Immutable financial/stock history.'));
        static::deleting(fn () => throw new \LogicException('Immutable financial/stock history.'));
    }

    public function payment(): BelongsTo
    {
        return $this->belongsTo(Payment::class, 'payment_id');
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'transaction_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'refunded_by');
    }
}
