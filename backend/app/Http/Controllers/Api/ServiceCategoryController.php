<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CatalogListRequest;
use App\Http\Requests\SaveServiceCategoryRequest;
use App\Http\Resources\ServiceCategoryResource;
use App\Models\ServiceCategory;
use App\Services\ServiceCatalogService;
use Illuminate\Http\Request;

class ServiceCategoryController extends Controller
{
    public function index(CatalogListRequest $request, ServiceCatalogService $catalog)
    {
        return ServiceCategoryResource::collection($catalog->listing($request->user(), $request->validated(), $request->perPage(), true));
    }

    public function show(Request $request, ServiceCategory $category, ServiceCatalogService $catalog): ServiceCategoryResource
    {
        return new ServiceCategoryResource($catalog->showCategory($request->user(), $category));
    }

    public function store(SaveServiceCategoryRequest $request, ServiceCatalogService $catalog)
    {
        return (new ServiceCategoryResource($catalog->createCategory($request->user(), $request->validated())))->response()->setStatusCode(201);
    }

    public function update(SaveServiceCategoryRequest $request, ServiceCategory $category, ServiceCatalogService $catalog): ServiceCategoryResource
    {
        return new ServiceCategoryResource($catalog->updateCategory($request->user(), $category, $request->validated()));
    }
}
