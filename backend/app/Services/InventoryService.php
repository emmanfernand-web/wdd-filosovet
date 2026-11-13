<?php

namespace App\Services;

use App\Models\GoodsReceivingItem;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\StockMovement;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\TransactionStockAllocation;
use App\Models\User;
use App\Support\InventoryValidation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class InventoryService
{
    public function record(User $actor, array $input): StockMovement
    {
        Gate::forUser($actor)->authorize('create', StockMovement::class);
        $data = Validator::make($input, InventoryValidation::movement())->validate();

        return $this->write($actor, $data);
    }

    /** Trusted document integration; never accepts a client-supplied ledger reference. */
    public function receivePurchaseItem(User $actor, GoodsReceivingItem $item): StockMovement
    {
        Gate::forUser($actor)->authorize('receive_purchase_orders');

        return DB::transaction(function () use ($actor, $item) {
            // ReceivingService holds PO/products first; retain product-first ordering here too.
            Product::whereKey($item->product_id)->lockForUpdate()->firstOrFail();
            $item = GoodsReceivingItem::whereKey($item->id)->lockForUpdate()->firstOrFail();
            $receipt = $item->goodsReceiving()->firstOrFail();
            if ($item->stock_movement_id || $receipt->received_by !== $actor->id) {
                throw ValidationException::withMessages(['receiving' => 'Receipt item already posted or invalid actor.']);
            }
            $movement = $this->write($actor, ['product_id' => $item->product_id, 'product_batch_id' => $item->product_batch_id,
                'movement_type' => 'purchase_receipt', 'quantity' => $item->quantity,
                'reason' => 'Goods receiving '.$receipt->receiving_number], $item->id);
            // Complete the new immutable document only inside its original atomic confirmation.
            GoodsReceivingItem::whereKey($item->id)->update(['stock_movement_id' => $movement->id]);

            return $movement;
        }, 3);
    }

    /** Trusted persisted sale allocation; never a public generic movement endpoint. */
    public function sellTransactionAllocation(User $actor, TransactionStockAllocation $allocation, Transaction $transaction): StockMovement
    {
        Gate::forUser($actor)->authorize('manage_transactions');

        return DB::transaction(function () use ($actor, $allocation, $transaction) {
            $transaction = Transaction::whereKey($transaction->id)->lockForUpdate()->firstOrFail();
            Product::whereKey($allocation->product_id)->lockForUpdate()->firstOrFail();
            $allocation = TransactionStockAllocation::whereKey($allocation->id)->lockForUpdate()->firstOrFail();
            $item = TransactionItem::whereKey($allocation->transaction_item_id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('transition', $transaction);
            if ($allocation->stock_movement_id || $item->transaction_id !== $transaction->id || $transaction->status !== 'draft' || $item->item_type !== 'product' || $item->product_id !== $allocation->product_id || $allocation->quantity < 1 || $allocation->quantity > $item->quantity) {
                throw ValidationException::withMessages(['allocation' => 'Invalid or already posted sale allocation.']);
            }
            $movement = $this->write($actor, ['product_id' => $allocation->product_id, 'product_batch_id' => $allocation->product_batch_id, 'movement_type' => 'sale', 'quantity' => $allocation->quantity, 'reason' => 'Sale '.$transaction->transaction_number], null, $item->id);
            TransactionStockAllocation::whereKey($allocation->id)->update(['stock_movement_id' => $movement->id]);

            return $movement;
        }, 3);
    }

    private function write(User $actor, array $data, ?int $receiptItemId = null, ?int $saleItemId = null): StockMovement
    {
        return DB::transaction(function () use ($actor, $data, $receiptItemId, $saleItemId) {
            // All catalog, batch and stock writers serialize on this product first.
            $product = Product::whereKey($data['product_id'])->lockForUpdate()->firstOrFail();
            if ($saleItemId !== null) {
                Gate::forUser($actor)->authorize('manage_transactions');
            } elseif ($receiptItemId !== null) {
                Gate::forUser($actor)->authorize('receive_purchase_orders');
            } else {
                Gate::forUser($actor)->authorize('create', StockMovement::class);
            }
            if (! $product->is_active) {
                throw ValidationException::withMessages(['product_id' => 'Product is inactive.']);
            }
            $batchId = $data['product_batch_id'] ?? null;
            if ($product->type === 'medicine') {
                $batch = ProductBatch::whereKey($batchId)->where('product_id', $product->id)->lockForUpdate()->first();
                if (! $batch) {
                    throw ValidationException::withMessages(['product_batch_id' => 'Medicine requires its own batch.']);
                }
                if (in_array($data['movement_type'], ['adjustment_out', 'sale'], true) && $batch->expiry_date->toDateString() < now('UTC')->toDateString()) {
                    throw ValidationException::withMessages(['product_batch_id' => 'Expired medicine cannot be used for normal stock-out.']);
                }
            } elseif ($batchId !== null) {
                throw ValidationException::withMessages(['product_batch_id' => 'General product uses an unbatched stock bucket.']);
            }

            // Locking reads use latest committed ledger even within MySQL REPEATABLE READ.
            $rows = StockMovement::where('product_id', $product->id)->where('product_batch_id', $batchId)
                ->orderBy('id')->lockForUpdate()->get(['id', 'direction', 'quantity']);
            if ($data['movement_type'] === 'opening_stock' && $rows->isNotEmpty()) {
                throw ValidationException::withMessages(['movement_type' => 'Opening stock must be the first and only opening entry for this bucket.']);
            }
            $balance = $rows->sum(fn ($row) => $row->direction === 'in' ? $row->quantity : -$row->quantity);
            $quantity = (int) $data['quantity'];
            $direction = in_array($data['movement_type'], ['adjustment_out', 'sale'], true) ? 'out' : 'in';
            $next = $balance + ($direction === 'in' ? $quantity : -$quantity);
            if ($next < 0 || $next > InventoryValidation::MAX_QUANTITY) {
                throw ValidationException::withMessages(['quantity' => 'Insufficient stock or bucket balance exceeds technical limit.']);
            }
            $movement = (new StockMovement)->forceFill([
                'product_id' => $product->id, 'product_batch_id' => $batchId,
                'movement_type' => $data['movement_type'], 'direction' => $direction, 'quantity' => $quantity,
                'reference_type' => $saleItemId !== null ? 'sale_transaction_item' : ($receiptItemId !== null ? 'goods_receiving_item' : null), 'reference_id' => $saleItemId ?? $receiptItemId,
                'reason' => $data['reason'], 'performed_by' => $actor->id, 'created_at' => now('UTC'),
            ]);
            $movement->save();

            return $movement;
        }, 3);
    }
}
