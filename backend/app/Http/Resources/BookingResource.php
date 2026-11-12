<?php

namespace App\Http\Resources;

use App\Support\BookingAccess;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $staff = $request->user() && BookingAccess::staffCanView($request->user(), $this->resource);

        return ['id' => $this->id, 'booking_code' => $this->booking_code, 'customer_id' => $this->customer_id,
            'pet_id' => $this->pet_id, 'service_id' => $this->service_id,
            'scheduled_at' => CarbonImmutable::parse($this->getRawOriginal('scheduled_at'), 'UTC')->toIso8601String(),
            'ends_at' => $this->getRawOriginal('ends_at') ? CarbonImmutable::parse($this->getRawOriginal('ends_at'), 'UTC')->toIso8601String() : null,
            'status' => $this->status->value, 'price_snapshot' => $this->price_snapshot, 'customer_notes' => $this->customer_notes,
            'staff_notes' => $this->when($staff, $this->staff_notes), 'created_by' => $this->when($staff, $this->created_by),
            'created_at' => $this->created_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String()];
    }
}
