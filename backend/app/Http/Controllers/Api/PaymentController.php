<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePaymentRefundRequest;
use App\Http\Requests\StorePaymentRequest;
use App\Http\Requests\TransactionListRequest;
use App\Http\Resources\PaymentRefundResource;
use App\Http\Resources\PaymentResource;
use App\Models\Payment;
use App\Models\Transaction;
use App\Services\PaymentService;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(TransactionListRequest $r, Transaction $transaction, PaymentService $s)
    {
        return PaymentResource::collection($s->listing($r->user(), $transaction, $r->perPage()));
    }

    public function store(StorePaymentRequest $r, Transaction $transaction, PaymentService $s)
    {
        [$payment,$created] = $s->record($r->user(), $transaction, $r->validated());

        return (new PaymentResource($payment))->response()->setStatusCode($created ? 201 : 200);
    }

    public function show(Request $r, Payment $payment, PaymentService $s)
    {
        return new PaymentResource($s->show($r->user(), $payment));
    }

    public function refund(StorePaymentRefundRequest $r, Payment $payment, PaymentService $s)
    {
        [$refund,$created] = $s->refund($r->user(), $payment, $r->validated());

        return (new PaymentRefundResource($refund))->response()->setStatusCode($created ? 201 : 200);
    }
}
