<?php

namespace App\Support;

use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Builder;

class InventoryBalance
{
    public const SIGNED_SUM = "COALESCE(SUM(CASE WHEN direction = 'in' THEN quantity ELSE -quantity END), 0)";

    public static function products(): Builder
    {
        $physical = StockMovement::selectRaw(self::SIGNED_SUM)->whereColumn('stock_movements.product_id', 'products.id');
        $expired = StockMovement::selectRaw(self::SIGNED_SUM)->join('product_batches', 'product_batches.id', '=', 'stock_movements.product_batch_id')
            ->whereColumn('stock_movements.product_id', 'products.id')->where('product_batches.expiry_date', '<', now('UTC')->toDateString());
        $base = Product::select('products.*')->selectSub($physical, 'physical_stock')->selectSub($expired, 'expired_stock');

        return Product::query()->fromSub($base, 'products')->select('products.*')
            ->selectRaw('CASE WHEN is_active = 1 THEN physical_stock - expired_stock ELSE 0 END AS usable_stock');
    }

    public static function batches(): Builder
    {
        $balance = StockMovement::selectRaw(self::SIGNED_SUM)->whereColumn('stock_movements.product_batch_id', 'product_batches.id');
        $base = ProductBatch::select('product_batches.*', 'products.is_active as product_active')
            ->join('products', 'products.id', '=', 'product_batches.product_id')->selectSub($balance, 'physical_stock');

        return ProductBatch::query()->fromSub($base, 'product_batches')->select('product_batches.*')
            ->selectRaw('CASE WHEN expiry_date < ? THEN physical_stock ELSE 0 END AS expired_stock', [now('UTC')->toDateString()])
            ->selectRaw('CASE WHEN product_active = 1 AND expiry_date >= ? THEN physical_stock ELSE 0 END AS usable_stock', [now('UTC')->toDateString()]);
    }
}
