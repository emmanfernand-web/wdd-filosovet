<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\StockMovement;
use App\Models\User;
use App\Support\InventoryBalance;
use Carbon\CarbonImmutable;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Gate;

class InventoryQueryService
{
    public function balances(User $actor, array $filters, int $perPage, bool $lowStock = false): LengthAwarePaginator
    {
        Gate::forUser($actor)->authorize('viewAny', ProductBatch::class);
        $query = InventoryBalance::products();
        if (! $actor->hasPermission('manage_inventory')) {
            $query->where('type', 'medicine');
        }
        foreach (['type', 'is_active', 'product_category_id'] as $field) {
            if (array_key_exists($field, $filters)) {
                $query->where($field, $filters[$field]);
            }
        }
        if (isset($filters['product_id'])) {
            $query->where('id', $filters['product_id']);
        }
        if ($lowStock) {
            $query->whereRaw('(CASE WHEN is_active = 1 THEN physical_stock - expired_stock ELSE 0 END) < minimum_stock');
        }

        return $query->orderBy('id')->paginate(min(max($perPage, 1), 100));
    }

    public function batches(User $actor, Product $product, array $filters, int $perPage): LengthAwarePaginator
    {
        Gate::forUser($actor)->authorize('viewAny', ProductBatch::class);
        Gate::forUser($actor)->authorize('view', $product);
        $query = $this->batchQuery($actor)->where('product_id', $product->id);
        if ($filters['usable_only'] ?? false) {
            $query->where('expiry_date', '>=', now('UTC')->toDateString())->where('product_active', true)->where('physical_stock', '>', 0);
        }

        return $query->orderBy('expiry_date')->orderBy('id')->paginate(min(max($perPage, 1), 100));
    }

    public function showBatch(User $actor, ProductBatch $batch): ProductBatch
    {
        Gate::forUser($actor)->authorize('view', $batch);

        return $this->batchQuery($actor)->where('id', $batch->id)->firstOrFail();
    }

    public function expiredBatches(User $actor, array $filters, int $perPage): LengthAwarePaginator
    {
        $query = $this->batchQuery($actor)->where('expiry_date', '<', now('UTC')->toDateString());
        if (isset($filters['product_id'])) {
            $query->where('product_id', $filters['product_id']);
        }

        return $query->orderBy('expiry_date')->orderBy('id')->paginate(min(max($perPage, 1), 100));
    }

    private function batchQuery(User $actor): Builder
    {
        Gate::forUser($actor)->authorize('viewAny', ProductBatch::class);
        $query = InventoryBalance::batches();
        if (! $actor->hasPermission('manage_inventory')) {
            $query->whereHas('product', fn ($query) => $query->where('type', 'medicine'));
        }

        return $query;
    }

    public function movements(User $actor, array $filters, int $perPage): LengthAwarePaginator
    {
        Gate::forUser($actor)->authorize('viewAny', StockMovement::class);
        $query = StockMovement::query();
        foreach (['product_id', 'product_batch_id', 'movement_type'] as $field) {
            if (isset($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }
        if (isset($filters['from'])) {
            $query->where('created_at', '>=', $filters['from'].' 00:00:00');
        }
        if (isset($filters['to'])) {
            $query->where('created_at', '<', CarbonImmutable::parse($filters['to'], 'UTC')->addDay()->format('Y-m-d H:i:s'));
        }

        return $query->orderByDesc('id')->paginate(min(max($perPage, 1), 100));
    }
}
