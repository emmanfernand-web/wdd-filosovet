<?php

namespace App\Services;

use App\Models\GoodsReceiving;
use App\Models\GoodsReceivingItem;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\PurchaseOrder;
use App\Models\User;
use App\Support\PurchasingMoney;
use App\Support\PurchasingValidation;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class GoodsReceivingService
{
    public function confirm(User $actor, PurchaseOrder $po, array $input): array
    {
        Gate::forUser($actor)->authorize('receive', $po);
        $data = Validator::make($input, PurchasingValidation::receipt())->validate();
        $data['idempotency_key'] = strtolower($data['idempotency_key']);
        $normalized = ['purchase_order_id' => $po->id, 'received_date' => $data['received_date'], 'notes' => $data['notes'] ?? null, 'items' => []];
        foreach ($data['items'] as $line) {
            $normalized['items'][] = ['purchase_order_item_id' => (int) $line['purchase_order_item_id'], 'quantity' => (int) $line['quantity'], 'batch_number' => $line['batch_number'] ?? null, 'expiry_date' => $line['expiry_date'] ?? null, 'actual_unit_price' => isset($line['actual_unit_price']) ? PurchasingMoney::format(PurchasingMoney::cents($line['actual_unit_price'])) : null];
        }
        // Item order is irrelevant to an idempotent receipt.
        usort($normalized['items'], fn ($a, $b) => strcmp(json_encode($a), json_encode($b)));
        $hash = hash('sha256', json_encode($normalized));
        try {
            return DB::transaction(function () use ($actor, $po, $data, $hash) {
                $po = PurchaseOrder::whereKey($po->id)->lockForUpdate()->firstOrFail();
                Gate::forUser($actor)->authorize('receive', $po);
                $existing = GoodsReceiving::where('idempotency_key', $data['idempotency_key'])->lockForUpdate()->first();
                if ($existing) {
                    if ($existing->purchase_order_id !== $po->id || $existing->payload_hash !== $hash) {
                        $this->invalid('Idempotency key was used for different receipt data.');
                    }

                    return [$existing->load('items.batch'), false];
                }
                if (! in_array($po->status, ['ordered', 'partially_received'], true)) {
                    $this->invalid('PO is not receivable.');
                }
                $items = $po->items()->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $products = Product::whereIn('id', $items->pluck('product_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $received = GoodsReceivingItem::where('purchase_order_id', $po->id)->orderBy('id')->lockForUpdate()->get()->groupBy('purchase_order_item_id')->map(fn ($rows) => (int) $rows->sum('quantity'));
                $totals = [];
                foreach ($data['items'] as $line) {
                    $item = $items->get($line['purchase_order_item_id']);
                    if (! $item) {
                        $this->invalid('Item does not belong to this PO.');
                    }
                    $totals[$item->id] = ($totals[$item->id] ?? 0) + (int) $line['quantity'];
                    if ($item->quantity_ordered < $totals[$item->id] + ($received[$item->id] ?? 0)) {
                        $this->invalid('Received quantity exceeds remaining quantity.');
                    }
                }
                $receipt = (new GoodsReceiving)->forceFill(['receiving_number' => 'GR-'.Str::ulid(), 'purchase_order_id' => $po->id, 'idempotency_key' => $data['idempotency_key'], 'payload_hash' => $hash, 'received_date' => $data['received_date'], 'received_by' => $actor->id, 'notes' => $data['notes'] ?? null]);
                $receipt->save();
                foreach ($data['items'] as $line) {
                    $item = $items[$line['purchase_order_item_id']];
                    $product = $products->get($item->product_id);
                    if (! $product?->is_active || $product->type !== $item->product_type || $product->unit !== $item->unit) {
                        $this->invalid('Product inactive or type/unit differs from ordered snapshot.');
                    }
                    $batch = null;
                    if ($product->type === 'medicine') {
                        if (trim((string) ($line['batch_number'] ?? '')) === '' || empty($line['expiry_date'])) {
                            $this->invalid('Medicine requires batch number and expiry date.');
                        }
                        if ($line['expiry_date'] < now('UTC')->toDateString() || $line['expiry_date'] < $data['received_date']) {
                            $this->invalid('Expired medicine cannot be received.');
                        }
                        $batch = ProductBatch::where('product_id', $product->id)->where('batch_number', $line['batch_number'])->lockForUpdate()->first();
                        if ($batch && $batch->expiry_date->toDateString() !== $line['expiry_date']) {
                            $this->invalid('Batch expiry differs from existing batch.');
                        }
                        if (! $batch) {
                            $batch = (new ProductBatch)->forceFill(['product_id' => $product->id, 'batch_number' => $line['batch_number'], 'expiry_date' => $line['expiry_date'], 'received_date' => $data['received_date']]);
                            $batch->save();
                        }
                    } elseif (($line['batch_number'] ?? null) !== null || ($line['expiry_date'] ?? null) !== null) {
                        $this->invalid('General product does not use batch fields.');
                    }
                    $price = $line['actual_unit_price'] ?? $item->unit_purchase_price;
                    $subtotal = PurchasingMoney::line((int) $line['quantity'], PurchasingMoney::cents($price));
                    $receivedItem = (new GoodsReceivingItem)->forceFill(['goods_receiving_id' => $receipt->id, 'purchase_order_id' => $po->id, 'purchase_order_item_id' => $item->id, 'product_id' => $product->id, 'product_batch_id' => $batch?->id, 'quantity' => (int) $line['quantity'], 'actual_unit_price' => PurchasingMoney::format(PurchasingMoney::cents($price)), 'subtotal' => PurchasingMoney::format($subtotal)]);
                    $receivedItem->save();
                    app(InventoryService::class)->receivePurchaseItem($actor, $receivedItem);
                }
                $full = $items->every(fn ($item) => ($received[$item->id] ?? 0) + ($totals[$item->id] ?? 0) === $item->quantity_ordered);
                $po->forceFill(['status' => $full ? 'fully_received' : 'partially_received'])->save();

                return [$receipt->load('items.batch'), true];
            }, 3);
        } catch (UniqueConstraintViolationException $e) {
            if (GoodsReceiving::where('idempotency_key', $data['idempotency_key'])->exists()) {
                $this->invalid('Idempotency key was already used; retry the original request.');
            }
            throw $e;
        }
    }

    public function listing(User $actor, PurchaseOrder $po, int $perPage)
    {
        Gate::forUser($actor)->authorize('view', $po);

        return $po->receivings()->with('items.batch')->orderByDesc('id')->paginate(min(max($perPage, 1), 100));
    }

    public function show(User $actor, GoodsReceiving $receipt): GoodsReceiving
    {
        Gate::forUser($actor)->authorize('view', $receipt->purchaseOrder);

        return $receipt->load('items.batch');
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['receiving' => $message]);
    }
}
