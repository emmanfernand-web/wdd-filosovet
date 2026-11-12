<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CatalogListRequest;
use App\Http\Requests\SaveServiceRequest;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use App\Services\ServiceCatalogService;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function index(CatalogListRequest $request, ServiceCatalogService $catalog)
    {
        return ServiceResource::collection($catalog->listing($request->user(), $request->validated(), $request->perPage(), false));
    }

    public function show(Request $request, Service $service, ServiceCatalogService $catalog): ServiceResource
    {
        return new ServiceResource($catalog->showService($request->user(), $service));
    }

    public function store(SaveServiceRequest $request, ServiceCatalogService $catalog)
    {
        return (new ServiceResource($catalog->createService($request->user(), $request->validated())))->response()->setStatusCode(201);
    }

    public function update(SaveServiceRequest $request, Service $service, ServiceCatalogService $catalog): ServiceResource
    {
        return new ServiceResource($catalog->updateService($request->user(), $service, $request->validated()));
    }
}
