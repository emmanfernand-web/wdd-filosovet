<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Only explicit arrays produced by BillingLookupService, never full domain models. */
class BillingLookupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return $this->resource;
    }
}
