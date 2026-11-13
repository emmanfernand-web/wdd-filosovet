<?php

namespace App\Http\Resources;

use App\Support\TransactionMoney;
use App\Support\TransactionSummary;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $summary = $this->resource->getAttribute('financial_summary') ?? TransactionSummary::calculate($this->resource);
        $amounts = [];
        foreach (['gross_paid', 'total_refunded', 'total_paid', 'remaining_balance'] as $field) {
            $amounts[$field] = TransactionMoney::format($summary[$field]);
        }

        return ['id' => $this->id, 'transaction_number' => $this->transaction_number, 'customer' => ['id' => $this->customer_id, 'name' => $this->customer->user->name],
            'booking' => $this->booking ? ['id' => $this->booking_id, 'booking_code' => $this->booking->booking_code, 'status' => $this->booking->status->value, 'pet' => ['id' => $this->booking->pet_id, 'name' => $this->booking->pet?->name], 'service_id' => $this->booking->service_id] : null,
            'transaction_date' => $this->transaction_date->toDateString(), 'currency' => 'IDR', 'status' => $this->status, 'payment_status' => $summary['payment_status'], 'refund_status' => $summary['refund_status'],
            'subtotal' => $this->subtotal, 'discount_amount' => '0.00', 'tax_amount' => '0.00', 'grand_total' => $this->grand_total, 'notes' => $this->notes, 'created_by' => ['id' => $this->created_by, 'name' => $this->creator?->name],
            'items' => TransactionItemResource::collection($this->whenLoaded('items')), 'payments' => PaymentResource::collection($this->whenLoaded('payments')), 'created_at' => $this->created_at?->toISOString(), 'updated_at' => $this->updated_at?->toISOString()] + $amounts;
    }
}
