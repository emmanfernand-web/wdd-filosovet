<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BillingLookupRequest;
use App\Http\Resources\BillingLookupResource;
use App\Services\BillingLookupService;

class BillingLookupController extends Controller
{
    public function index(BillingLookupRequest $r, string $kind, BillingLookupService $s)
    {
        return BillingLookupResource::collection($s->listing($r->user(), $kind, $r->validated(), $r->perPage()));
    }
}
