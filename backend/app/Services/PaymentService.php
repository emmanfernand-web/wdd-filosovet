<?php

namespace App\Services;

use App\Models\Payment;
use App\Models\PaymentMethod;
use App\Models\PaymentRefund;
use App\Models\Transaction;
use App\Models\User;
use App\Support\TransactionMoney as Money;
use App\Support\TransactionSummary;
use App\Support\TransactionValidation;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PaymentService
{
    public function record(User $actor, Transaction $transaction, array $input): array
    {
        Gate::forUser($actor)->authorize('pay', $transaction);
        $data = Validator::make($input, TransactionValidation::payment())->validate();
        $data['idempotency_key'] = strtolower($data['idempotency_key']);
        $amount = Money::cents($data['amount']);
        if ($amount < 1) {
            $this->invalid('Payment amount must be positive.');
        }
        $hash = hash('sha256', json_encode(['transaction_id' => $transaction->id, 'payment_date' => $data['payment_date'], 'amount' => Money::format($amount), 'method' => $data['method'], 'status' => $data['status'], 'reference_number' => $data['reference_number'] ?? null, 'notes' => $data['notes'] ?? null]));
        try {
            return DB::transaction(function () use ($actor, $transaction, $data, $amount, $hash) {
                $row = Transaction::whereKey($transaction->id)->lockForUpdate()->firstOrFail();
                Gate::forUser($actor)->authorize('pay', $row);
                $existing = Payment::where('idempotency_key', $data['idempotency_key'])->lockForUpdate()->first();
                if ($existing) {
                    if ($existing->transaction_id !== $row->id || $existing->payload_hash !== $hash) {
                        $this->invalid('Idempotency key was used for different payment data.');
                    }

                    return [$existing->load(['receiver', 'refunds.actor', 'transaction.customer.user']), false];
                }
                if (! in_array($row->status, ['confirmed', 'completed'], true)) {
                    $this->invalid('Payment requires confirmed/completed transaction.');
                }
                $method = PaymentMethod::where('code', $data['method'])->lockForUpdate()->first();
                if (! $method?->is_active) {
                    $this->invalid('Payment method unavailable.');
                }
                $summary = TransactionSummary::calculate($row, true);
                if ($data['status'] === 'succeeded') {
                    if ($amount > $summary['remaining_balance']) {
                        $this->invalid('Payment exceeds remaining balance.');
                    }
                    Money::add($summary['gross_paid'], $amount);
                }
                $payment = (new Payment)->forceFill(['transaction_id' => $row->id, 'payment_number' => 'PY-'.Str::ulid(), 'payment_method_id' => $method->id, 'method_snapshot' => $method->code, 'idempotency_key' => $data['idempotency_key'], 'payload_hash' => $hash, 'payment_date' => $data['payment_date'], 'amount' => Money::format($amount), 'status' => $data['status'], 'reference_number' => $data['reference_number'] ?? null, 'notes' => $data['notes'] ?? null, 'received_by' => $actor->id]);
                $payment->save();

                return [$payment->load(['receiver', 'refunds.actor', 'transaction.customer.user']), true];
            }, 3);
        } catch (UniqueConstraintViolationException $e) {
            if (Payment::where('idempotency_key', $data['idempotency_key'])->exists()) {
                $this->invalid('Idempotency key already used; retry original request.');
            }throw $e;
        }
    }

    public function refund(User $actor, Payment $payment, array $input): array
    {
        Gate::forUser($actor)->authorize('refund', $payment->transaction);
        $data = Validator::make($input, TransactionValidation::refund())->validate();
        $data['idempotency_key'] = strtolower($data['idempotency_key']);
        $amount = Money::cents($data['amount']);
        if ($amount < 1) {
            $this->invalid('Refund amount must be positive.');
        }
        $hash = hash('sha256', json_encode(['payment_id' => $payment->id, 'refund_date' => $data['refund_date'], 'amount' => Money::format($amount), 'reason' => $data['reason']]));
        try {
            return DB::transaction(function () use ($actor, $payment, $data, $amount, $hash) {
                $transaction = Transaction::whereKey($payment->transaction_id)->lockForUpdate()->firstOrFail();
                Gate::forUser($actor)->authorize('refund', $transaction);
                $payment = Payment::whereKey($payment->id)->lockForUpdate()->firstOrFail();
                $existing = PaymentRefund::where('idempotency_key', $data['idempotency_key'])->lockForUpdate()->first();
                if ($existing) {
                    if ($existing->payment_id !== $payment->id || $existing->payload_hash !== $hash) {
                        $this->invalid('Idempotency key was used for different refund data.');
                    }

                    return [$existing->load('actor'), false];
                }
                if ($payment->status !== 'succeeded') {
                    $this->invalid('Only succeeded payments can be refunded.');
                }
                $returned = 0;
                foreach ($payment->refunds()->orderBy('id')->lockForUpdate()->get() as $refund) {
                    $returned = Money::add($returned, Money::cents($refund->amount));
                }
                if ($amount > Money::cents($payment->amount) - $returned) {
                    $this->invalid('Refund exceeds unrefunded payment amount.');
                }
                $refund = (new PaymentRefund)->forceFill(['transaction_id' => $transaction->id, 'payment_id' => $payment->id, 'refund_number' => 'RF-'.Str::ulid(), 'idempotency_key' => $data['idempotency_key'], 'payload_hash' => $hash, 'refund_date' => $data['refund_date'], 'amount' => Money::format($amount), 'reason' => $data['reason'], 'refunded_by' => $actor->id]);
                $refund->save();

                return [$refund->load('actor'), true];
            }, 3);
        } catch (UniqueConstraintViolationException $e) {
            if (PaymentRefund::where('idempotency_key', $data['idempotency_key'])->exists()) {
                $this->invalid('Idempotency key already used; retry original request.');
            }throw $e;
        }
    }

    public function show(User $actor, Payment $payment): Payment
    {
        Gate::forUser($actor)->authorize('view', $payment->transaction);

        return $payment->load(['receiver', 'refunds.actor', 'transaction.customer.user']);
    }

    public function listing(User $actor, Transaction $transaction, int $perPage = 20)
    {
        Gate::forUser($actor)->authorize('view', $transaction);

        return $transaction->payments()->with(['receiver', 'refunds.actor', 'transaction.customer.user'])->orderBy('id')->paginate(min(max($perPage, 1), 100));
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['payment' => $message]);
    }
}
