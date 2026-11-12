<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\InventoryListRequest;
use App\Http\Requests\SaveProductCategoryRequest;
use App\Http\Requests\SaveProductRequest;
use App\Http\Requests\StoreProductBatchRequest;
use App\Http\Resources\ProductBatchResource;
use App\Http\Resources\ProductCategoryResource;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\ProductCategory;
use App\Services\InventoryCatalogService;
use Illuminate\Http\Request;

class InventoryCatalogController extends Controller
{
    public function index(InventoryListRequest $request, InventoryCatalogService $catalog)
    {
        return ProductResource::collection($catalog->products($request->user(), $request->validated(), $request->perPage()));
    }

    public function show(Request $request, Product $product, InventoryCatalogService $catalog): ProductResource
    {
        return new ProductResource($catalog->show($request->user(), $product));
    }

    public function store(SaveProductRequest $request, InventoryCatalogService $catalog)
    {
        return (new ProductResource($catalog->saveProduct($request->user(), $request->validated())))->response()->setStatusCode(201);
    }

    public function update(SaveProductRequest $request, Product $product, InventoryCatalogService $catalog): ProductResource
    {
        return new ProductResource($catalog->saveProduct($request->user(), $request->validated(), $product));
    }

    public function categories(InventoryListRequest $request, InventoryCatalogService $catalog)
    {
        return ProductCategoryResource::collection($catalog->categories($request->user(), $request->perPage()));
    }

    public function storeCategory(SaveProductCategoryRequest $request, InventoryCatalogService $catalog)
    {
        return (new ProductCategoryResource($catalog->saveCategory($request->user(), $request->validated())))->response()->setStatusCode(201);
    }

    public function updateCategory(SaveProductCategoryRequest $request, ProductCategory $category, InventoryCatalogService $catalog): ProductCategoryResource
    {
        return new ProductCategoryResource($catalog->saveCategory($request->user(), $request->validated(), $category));
    }

    public function batches(InventoryListRequest $request, Product $product, InventoryCatalogService $catalog)
    {
        return ProductBatchResource::collection($catalog->batches($request->user(), $product, $request->perPage(), $request->validated()));
    }

    public function storeBatch(StoreProductBatchRequest $request, Product $product, InventoryCatalogService $catalog)
    {
        return (new ProductBatchResource($catalog->createBatch($request->user(), $product, $request->validated())))->response()->setStatusCode(201);
    }

    public function showBatch(Request $request, ProductBatch $batch, InventoryCatalogService $catalog): ProductBatchResource
    {
        return new ProductBatchResource($catalog->showBatch($request->user(), $batch));
    }
}
