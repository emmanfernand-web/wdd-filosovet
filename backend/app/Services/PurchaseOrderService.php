<?php

namespace App\Services;

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\Supplier;
use App\Models\User;
use App\Support\PurchasingMoney;
use App\Support\PurchasingValidation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PurchaseOrderService
{
    public function listing(User $actor, array $filters, int $perPage)
    {
        Gate::forUser($actor)->authorize('viewAny', PurchaseOrder::class);
        $q = PurchaseOrder::with('supplier');
        foreach (['supplier_id', 'status'] as $f) {
            if (isset($filters[$f])) {
                $q->where($f, $filters[$f]);
            }
        }if (isset($filters['from'])) {
            $q->where('order_date', '>=', $filters['from']);
        }if (isset($filters['to'])) {
            $q->where('order_date', '<=', $filters['to']);
        }

        return $q->orderByDesc('id')->paginate(min(max($perPage, 1), 100));
    }

    public function show(User $actor, PurchaseOrder $po): PurchaseOrder
    {
        Gate::forUser($actor)->authorize('view', $po);

        return $po->load(['supplier', 'items.receivingItems']);
    }

    public function save(User $actor, array $input, ?PurchaseOrder $po = null): PurchaseOrder
    {
        Gate::forUser($actor)->authorize($po ? 'update' : 'create', $po ?? PurchaseOrder::class);
        $data = Validator::make($input, PurchasingValidation::po($po !== null))->validate();

        return DB::transaction(function () use ($actor, $po, $data) {
            if ($po) {
                $po = PurchaseOrder::whereKey($po->id)->lockForUpdate()->firstOrFail();
                Gate::forUser($actor)->authorize('update', $po);
                if ($po->status !== 'draft') {
                    $this->invalid('Only draft purchase orders may be edited.');
                }
            }
            $supplier = Supplier::whereKey($data['supplier_id'] ?? $po?->supplier_id)->lockForUpdate()->firstOrFail();
            if (! $supplier->is_active) {
                $this->invalid('Supplier is inactive.');
            }
            $order = $data['order_date'] ?? $po?->order_date->toDateString();
            $expected = array_key_exists('expected_delivery_date', $data) ? $data['expected_delivery_date'] : $po?->expected_delivery_date?->toDateString();
            if ($expected && $expected < $order) {
                $this->invalid('Expected delivery cannot precede order date.');
            }
            if (! $po) {
                $po = (new PurchaseOrder)->forceFill(['po_number' => 'PO-'.Str::ulid(), 'created_by' => $actor->id, 'status' => 'draft', 'subtotal' => '0.00', 'total' => '0.00']);
            }
            $header = collect($data)->except('items')->all();
            $po->forceFill($header)->save();
            if (array_key_exists('items', $data)) {
                $ids = array_column($data['items'], 'product_id');
                sort($ids);
                $products = Product::whereIn('id', $ids)->orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $lines = [];
                $total = 0;
                foreach ($data['items'] as $item) {
                    $product = $products->get($item['product_id']);
                    if (! $product?->is_active) {
                        $this->invalid('Product is inactive.');
                    }$price = PurchasingMoney::cents($item['unit_purchase_price']);
                    $subtotal = PurchasingMoney::line((int) $item['quantity_ordered'], $price);
                    $total = PurchasingMoney::add($total, $subtotal);
                    $lines[] = ['product_id' => $product->id, 'product_name' => $product->name, 'product_type' => $product->type, 'unit' => $product->unit, 'quantity_ordered' => (int) $item['quantity_ordered'], 'unit_purchase_price' => PurchasingMoney::format($price), 'subtotal' => PurchasingMoney::format($subtotal)];
                }
                $po->items()->delete();
                foreach ($lines as $line) {
                    (new PurchaseOrderItem)->forceFill($line + ['purchase_order_id' => $po->id])->save();
                }
                $po->forceFill(['subtotal' => PurchasingMoney::format($total), 'total' => PurchasingMoney::format($total)])->save();
            }

            return $po->load(['supplier', 'items.receivingItems']);
        }, 3);
    }

    public function transition(User $actor, PurchaseOrder $po, string $status): PurchaseOrder
    {
        Gate::forUser($actor)->authorize('update', $po);

        return DB::transaction(function () use ($actor, $po, $status) {
            $po = PurchaseOrder::whereKey($po->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('update', $po);
            if ($status === 'ordered' && $po->status === 'draft') {
                $supplier = Supplier::whereKey($po->supplier_id)->lockForUpdate()->firstOrFail();
                if (! $supplier->is_active) {
                    $this->invalid('Supplier is inactive.');
                }
                $items = $po->items()->orderBy('product_id')->lockForUpdate()->get();
                if ($items->isEmpty()) {
                    $this->invalid('Cannot order an empty PO.');
                }
                foreach (Product::whereIn('id', $items->pluck('product_id'))->orderBy('id')->lockForUpdate()->get()->keyBy('id') as $p) {
                    $item = $items->firstWhere('product_id', $p->id);
                    if (! $p->is_active || $p->type !== $item->product_type || $p->unit !== $item->unit) {
                        $this->invalid('Product changed; update draft items before ordering.');
                    }
                }
            } elseif ($status === 'cancelled' && in_array($po->status, ['draft', 'ordered'], true) && ! $po->receivings()->lockForUpdate()->first(['id'])) {
            } else {
                $this->invalid('Illegal purchase order status transition.');
            }
            $po->forceFill(['status' => $status])->save();

            return $po->load(['supplier', 'items.receivingItems']);
        }, 3);
    }

    private function invalid(string $message): never
    {
        throw ValidationException::withMessages(['purchase_order' => $message]);
    }
}
