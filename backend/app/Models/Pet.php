<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

#[Fillable(['name', 'species', 'breed', 'gender', 'date_of_birth', 'weight', 'color', 'microchip_number', 'notes'])]
class Pet extends Model
{
    use SoftDeletes;

    protected function casts(): array
    {
        return ['date_of_birth' => 'date', 'weight' => 'decimal:3'];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }
}
