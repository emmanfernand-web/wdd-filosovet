<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Transaction extends Model
{
    protected $guarded = ['*'];

    protected function casts(): array
    {
        return ['transaction_date' => 'immutable_date', 'subtotal' => 'decimal:2', 'grand_total' => 'decimal:2'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function booking(): BelongsTo
    {
        return $this->belongsTo(Booking::class, 'booking_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(TransactionItem::class, 'transaction_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class, 'transaction_id');
    }

    public function refunds(): HasMany
    {
        return $this->hasMany(PaymentRefund::class, 'transaction_id');
    }

    protected static function booted(): void
    {
        static::deleting(fn () => throw new \LogicException('Transactions cannot be deleted.'));
        static::updating(function (self $row) {
            if ($row->getRawOriginal('status') !== 'draft' && $row->isDirty(['customer_id', 'booking_id', 'subtotal', 'grand_total', 'transaction_date', 'notes', 'created_by'])) {
                throw new \LogicException('Confirmed transaction is immutable.');
            }
        });
    }
}
