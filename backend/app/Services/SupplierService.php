<?php

namespace App\Services;

use App\Models\Supplier;
use App\Models\User;
use App\Support\PurchasingValidation;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;

class SupplierService
{
    public function listing(User $actor, array $filters, int $perPage)
    {
        Gate::forUser($actor)->authorize('viewAny', Supplier::class);
        $q = Supplier::query();
        if (isset($filters['search'])) {
            $term = str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $filters['search']);
            $q->where(function ($q) use ($term) {
                $q->whereRaw("name LIKE ? ESCAPE '!'", ['%'.$term.'%'])->orWhereRaw("contact_name LIKE ? ESCAPE '!'", ['%'.$term.'%']);
            });
        }if (array_key_exists('is_active', $filters)) {
            $q->where('is_active', $filters['is_active']);
        }

        return $q->orderBy('id')->paginate(min(max($perPage, 1), 100));
    }

    public function show(User $actor, Supplier $supplier): Supplier
    {
        Gate::forUser($actor)->authorize('view', $supplier);

        return $supplier;
    }

    public function save(User $actor, array $input, ?Supplier $supplier = null): Supplier
    {
        Gate::forUser($actor)->authorize($supplier ? 'update' : 'create', $supplier ?? Supplier::class);
        $data = Validator::make($input, PurchasingValidation::supplier($supplier !== null))->validate();

        return DB::transaction(function () use ($actor, $supplier, $data) {
            if ($supplier) {
                $supplier = Supplier::whereKey($supplier->id)->lockForUpdate()->firstOrFail();
                Gate::forUser($actor)->authorize('update', $supplier);
            } else {
                $supplier = new Supplier;
            }$supplier->forceFill($data)->save();

            return $supplier->refresh();
        }, 3);
    }
}
