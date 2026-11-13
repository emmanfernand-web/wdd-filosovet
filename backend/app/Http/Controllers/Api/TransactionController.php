<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\SaveTransactionRequest;
use App\Http\Requests\TransactionListRequest;
use App\Http\Requests\TransactionStatusRequest;
use App\Http\Resources\TransactionResource;
use App\Models\Transaction;
use App\Services\TransactionService;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    public function index(TransactionListRequest $r, TransactionService $s)
    {
        return TransactionResource::collection($s->listing($r->user(), $r->validated(), $r->perPage()));
    }

    public function show(Request $r, Transaction $transaction, TransactionService $s)
    {
        return new TransactionResource($s->show($r->user(), $transaction));
    }

    public function store(SaveTransactionRequest $r, TransactionService $s)
    {
        return (new TransactionResource($s->save($r->user(), $r->validated())))->response()->setStatusCode(201);
    }

    public function update(SaveTransactionRequest $r, Transaction $transaction, TransactionService $s)
    {
        return new TransactionResource($s->save($r->user(), $r->validated(), $transaction));
    }

    public function status(TransactionStatusRequest $r, Transaction $transaction, TransactionService $s)
    {
        return new TransactionResource($s->transition($r->user(), $transaction, $r->validated('status')));
    }
}
