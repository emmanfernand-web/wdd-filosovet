<?php

namespace App\Support;

use App\Models\Payment;
use App\Models\PaymentRefund;
use App\Models\Transaction;

class TransactionSummary
{
    public static function calculate(Transaction $transaction, bool $lock = false): array
    {
        $gross = 0;
        $returned = 0;
        if ($lock) {
            // Caller owns the transaction row lock; current reads serialize all money writers.
            foreach ($transaction->payments()->orderBy('id')->lockForUpdate()->get() as $payment) {
                if ($payment->status === 'succeeded') {
                    $gross = TransactionMoney::add($gross, TransactionMoney::cents($payment->amount));
                }
            }
            foreach ($transaction->refunds()->orderBy('id')->lockForUpdate()->get() as $refund) {
                $returned = TransactionMoney::add($returned, TransactionMoney::cents($refund->amount));
            }
        } else {
            // One statement gives one consistent snapshot even across concurrent commits.
            $payments = Payment::where('transaction_id', $transaction->id)->where('status', 'succeeded')->select('amount')->selectRaw("'payment' AS entry_kind");
            $refunds = PaymentRefund::where('transaction_id', $transaction->id)->select('amount')->selectRaw("'refund' AS entry_kind");
            foreach ($payments->unionAll($refunds)->get() as $entry) {
                if ($entry->entry_kind === 'payment') {
                    $gross = TransactionMoney::add($gross, TransactionMoney::cents($entry->amount));
                } else {
                    $returned = TransactionMoney::add($returned, TransactionMoney::cents($entry->amount));
                }
            }
        }
        $net = $gross - $returned;
        $total = TransactionMoney::cents($transaction->grand_total);
        if ($net < 0 || $net > $total) {
            throw new \LogicException('Invalid payment history balance.');
        }

        return ['gross_paid' => $gross, 'total_refunded' => $returned, 'total_paid' => $net, 'remaining_balance' => $total - $net,
            'payment_status' => $net === $total ? 'paid' : ($net > 0 ? 'partially_paid' : 'unpaid'),
            'refund_status' => $returned === 0 ? 'none' : ($returned === $gross ? 'refunded' : 'partially_refunded')];
    }
}
