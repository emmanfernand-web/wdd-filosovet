<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentRefundResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'refund_number' => $this->refund_number, 'transaction_id' => $this->transaction_id, 'payment_id' => $this->payment_id, 'refund_date' => $this->refund_date->toDateString(), 'amount' => $this->amount, 'reason' => $this->reason, 'refunded_by' => ['id' => $this->refunded_by, 'name' => $this->actor?->name], 'created_at' => $this->created_at?->toISOString()];
    }
}
