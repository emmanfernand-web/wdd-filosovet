<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\ProductCategory;
use App\Models\User;
use App\Support\InventoryAccess;
use App\Support\InventoryValidation;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class InventoryCatalogService
{
    public function products(User $actor, array $filters, int $perPage): LengthAwarePaginator
    {
        Gate::forUser($actor)->authorize('viewAny', Product::class);
        $query = InventoryAccess::scopeProducts(Product::with('category'), $actor);
        foreach (['type', 'is_active', 'product_category_id'] as $field) {
            if (array_key_exists($field, $filters)) {
                $query->where($field, $filters[$field]);
            }
        }

        return $query->orderBy('id')->paginate(min(max($perPage, 1), 100));
    }

    public function show(User $actor, Product $product): Product
    {
        Gate::forUser($actor)->authorize('view', $product);

        return $product->load('category');
    }

    public function categories(User $actor, int $perPage): LengthAwarePaginator
    {
        Gate::forUser($actor)->authorize('viewAny', ProductCategory::class);

        return ProductCategory::orderBy('id')->paginate(min(max($perPage, 1), 100));
    }

    public function saveCategory(User $actor, array $input, ?ProductCategory $category = null): ProductCategory
    {
        Gate::forUser($actor)->authorize($category ? 'update' : 'create', $category ?? ProductCategory::class);
        $data = Validator::make($input, InventoryValidation::category($category))->validate();
        if (! $category) {
            return ProductCategory::create($data);
        }
        $category->update($data);

        return $category->refresh();
    }

    public function saveProduct(User $actor, array $input, ?Product $product = null): Product
    {
        Gate::forUser($actor)->authorize($product ? 'update' : 'create', $product ?? Product::class);
        $data = Validator::make($input, InventoryValidation::product($product))->validate();

        return DB::transaction(function () use ($actor, $product, $data) {
            if ($product) {
                $product = Product::whereKey($product->id)->lockForUpdate()->firstOrFail();
                Gate::forUser($actor)->authorize('update', $product);
                // Current reads also protect nested MySQL transactions with an older snapshot.
                if ($product->batches()->lockForUpdate()->first(['id']) || $product->movements()->lockForUpdate()->first(['id'])) {
                    foreach (['type', 'unit'] as $field) {
                        if (isset($data[$field]) && $data[$field] !== $product->$field) {
                            throw ValidationException::withMessages([$field => 'Cannot change historical product type or unit.']);
                        }
                    }
                }
                $product->update($data);
            } else {
                $product = Product::create($data);
            }

            return $product->refresh()->load('category');
        }, 3);
    }

    public function createBatch(User $actor, Product $product, array $input): ProductBatch
    {
        Gate::forUser($actor)->authorize('create', ProductBatch::class);
        $data = Validator::make($input, InventoryValidation::batch($product))->validate();

        return DB::transaction(function () use ($actor, $product, $data) {
            $product = Product::whereKey($product->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('create', ProductBatch::class);
            if ($product->type !== 'medicine' || ! $product->is_active) {
                throw ValidationException::withMessages(['product_id' => 'An active medicine product is required.']);
            }
            $batch = (new ProductBatch)->forceFill($data + ['product_id' => $product->id]);
            $batch->save();

            return $batch;
        }, 3);
    }

    public function batches(User $actor, Product $product, int $perPage, array $filters = []): LengthAwarePaginator
    {
        return app(InventoryQueryService::class)->batches($actor, $product, $filters, $perPage);
    }

    public function showBatch(User $actor, ProductBatch $batch): ProductBatch
    {
        return app(InventoryQueryService::class)->showBatch($actor, $batch);
    }
}
