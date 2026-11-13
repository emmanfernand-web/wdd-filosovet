<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'payment_number' => $this->payment_number, 'transaction_id' => $this->transaction_id, 'transaction' => ['id' => $this->transaction_id, 'transaction_number' => $this->transaction->transaction_number, 'customer' => ['id' => $this->transaction->customer_id, 'name' => $this->transaction->customer->user->name]], 'payment_date' => $this->payment_date->toDateString(), 'amount' => $this->amount, 'method' => $this->method_snapshot, 'status' => $this->status, 'reference_number' => $this->reference_number, 'notes' => $this->notes, 'received_by' => ['id' => $this->received_by, 'name' => $this->receiver?->name], 'refunds' => PaymentRefundResource::collection($this->whenLoaded('refunds')), 'created_at' => $this->created_at?->toISOString()];
    }
}
