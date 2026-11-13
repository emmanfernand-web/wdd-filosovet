<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\StockMovement;
use App\Models\Transaction;
use App\Models\TransactionStockAllocation;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class TransactionStockService
{
    /** Only confirmation under the transaction lock may create allocation documents. */
    public function confirm(User $actor, Transaction $transaction): void
    {
        Gate::forUser($actor)->authorize('transition', $transaction);
        if (DB::transactionLevel() < 1 || $transaction->status !== 'draft') {
            throw new \LogicException('Confirmation transaction required.');
        }
        $items = $transaction->items()->orderBy('id')->lockForUpdate()->get();
        $products = Product::whereIn('id', $items->pluck('product_id')->filter())->orderBy('id')->lockForUpdate()->get()->keyBy('id');
        $services = Service::whereIn('id', $items->pluck('service_id')->filter())->orderBy('id')->lockForUpdate()->get()->keyBy('id');
        foreach ($items as $item) {
            if ($item->item_type === 'service') {
                $service = $services->get($item->service_id);
                if (! $service?->is_active || ! ServiceCategory::whereKey($service->service_category_id)->lockForUpdate()->value('is_active')) {
                    $this->invalid('Service or category inactive.');
                }

                continue;
            }
            $product = $products->get($item->product_id);
            if (! $product?->is_active || $product->type !== $item->product_type || $product->unit !== $item->unit) {
                $this->invalid('Product inactive or type/unit differs from snapshot.');
            }
            $remaining = $item->quantity;
            $batches = $product->type === 'medicine' ? ProductBatch::where('product_id', $product->id)->where('expiry_date', '>=', now('UTC')->toDateString())->orderBy('expiry_date')->orderBy('id')->lockForUpdate()->get() : collect([null]);
            foreach ($batches as $batch) {
                $rows = StockMovement::where('product_id', $product->id)->where('product_batch_id', $batch?->id)->orderBy('id')->lockForUpdate()->get();
                $balance = 0;
                foreach ($rows as $movement) {
                    $balance += $movement->direction === 'in' ? $movement->quantity : -$movement->quantity;
                }
                $quantity = min($remaining, max(0, $balance));
                if ($quantity === 0) {
                    continue;
                }
                $allocation = (new TransactionStockAllocation)->forceFill(['transaction_item_id' => $item->id, 'product_id' => $product->id, 'product_batch_id' => $batch?->id, 'quantity' => $quantity]);
                $allocation->save();
                app(InventoryService::class)->sellTransactionAllocation($actor, $allocation, $transaction);
                $remaining -= $quantity;
                if ($remaining === 0) {
                    break;
                }
            }
            if ($remaining > 0) {
                $this->invalid('Insufficient usable stock.');
            }
        }
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['items' => $message]);
    }
}
