<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\StockMovement;
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

        return DB::transaction(function () use ($actor, $data) {
            // All catalog, batch and stock writers serialize on this product first.
            $product = Product::whereKey($data['product_id'])->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('create', StockMovement::class);
            if (! $product->is_active) {
                throw ValidationException::withMessages(['product_id' => 'Product is inactive.']);
            }
            $batchId = $data['product_batch_id'] ?? null;
            if ($product->type === 'medicine') {
                $batch = ProductBatch::whereKey($batchId)->where('product_id', $product->id)->lockForUpdate()->first();
                if (! $batch) {
                    throw ValidationException::withMessages(['product_batch_id' => 'Medicine requires its own batch.']);
                }
                if ($data['movement_type'] === 'adjustment_out' && $batch->expiry_date->toDateString() < now('UTC')->toDateString()) {
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
            $direction = $data['movement_type'] === 'adjustment_out' ? 'out' : 'in';
            $next = $balance + ($direction === 'in' ? $quantity : -$quantity);
            if ($next < 0 || $next > InventoryValidation::MAX_QUANTITY) {
                throw ValidationException::withMessages(['quantity' => 'Insufficient stock or bucket balance exceeds technical limit.']);
            }
            $movement = (new StockMovement)->forceFill([
                'product_id' => $product->id, 'product_batch_id' => $batchId,
                'movement_type' => $data['movement_type'], 'direction' => $direction, 'quantity' => $quantity,
                'reason' => $data['reason'], 'performed_by' => $actor->id, 'created_at' => now('UTC'),
            ]);
            $movement->save();

            return $movement;
        }, 3);
    }
}
