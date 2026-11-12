<?php

namespace App\Services;

use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\User;
use App\Support\ServiceBookingValidation;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ServiceCatalogService
{
    public function listing(?User $actor, array $filters, int $perPage, bool $categories = false): LengthAwarePaginator
    {
        $manager = $actor?->hasPermission('manage_services') ?? false;
        if (array_key_exists('is_active', $filters)) {
            abort_unless($manager, 403);
        }
        $query = $categories ? ServiceCategory::query() : Service::with('category');
        if (! $manager) {
            $query->where('is_active', true);
            if (! $categories) {
                $query->whereHas('category', fn ($q) => $q->where('is_active', true));
            }
        } elseif (array_key_exists('is_active', $filters)) {
            $query->where('is_active', (bool) $filters['is_active']);
        }
        if (! $categories && isset($filters['service_category_id'])) {
            $query->where('service_category_id', $filters['service_category_id']);
        }

        return $query->orderBy('id')->paginate(min(max($perPage, 1), 100));
    }

    public function showService(?User $actor, Service $service): Service
    {
        $service->load('category');
        abort_unless(Gate::forUser($actor)->allows('view', $service), 404);

        return $service;
    }

    public function showCategory(?User $actor, ServiceCategory $category): ServiceCategory
    {
        abort_unless(Gate::forUser($actor)->allows('view', $category), 404);

        return $category;
    }

    public function createCategory(User $actor, array $input): ServiceCategory
    {
        Gate::forUser($actor)->authorize('create', ServiceCategory::class);

        return ServiceCategory::create(Validator::make($input, ServiceBookingValidation::category())->validate());
    }

    public function updateCategory(User $actor, ServiceCategory $category, array $input): ServiceCategory
    {
        Gate::forUser($actor)->authorize('update', $category);
        $data = Validator::make($input, ServiceBookingValidation::category($category))->validate();

        return DB::transaction(function () use ($category, $data) {
            $category = ServiceCategory::whereKey($category->id)->lockForUpdate()->firstOrFail();
            if (isset($data['slug']) && $data['slug'] !== $category->slug && $category->services()->exists()) {
                throw ValidationException::withMessages(['slug' => 'Referenced category slug cannot be changed.']);
            }
            $category->update($data);

            return $category->refresh();
        });
    }

    public function createService(User $actor, array $input): Service
    {
        Gate::forUser($actor)->authorize('create', Service::class);
        $data = Validator::make($input, ServiceBookingValidation::service())->validate();

        return DB::transaction(function () use ($data) {
            $category = ServiceCategory::whereKey($data['service_category_id'])->lockForUpdate()->firstOrFail();
            if (! $category->is_active) {
                throw ValidationException::withMessages(['service_category_id' => 'Category is inactive.']);
            }

            return Service::create($data)->load('category');
        });
    }

    public function updateService(User $actor, Service $service, array $input): Service
    {
        Gate::forUser($actor)->authorize('update', $service);
        $data = Validator::make($input, ServiceBookingValidation::service($service))->validate();

        return DB::transaction(function () use ($service, $data) {
            $service = Service::whereKey($service->id)->lockForUpdate()->firstOrFail();
            $categoryId = $data['service_category_id'] ?? $service->service_category_id;
            $category = ServiceCategory::whereKey($categoryId)->lockForUpdate()->firstOrFail();
            if (array_key_exists('service_category_id', $data) && ! $category->is_active) {
                throw ValidationException::withMessages(['service_category_id' => 'Category is inactive.']);
            }
            if ($categoryId != $service->service_category_id && $service->bookings()->exists()) {
                throw ValidationException::withMessages(['service_category_id' => 'Booked service cannot be reclassified.']);
            }
            $service->update($data);

            return $service->refresh()->load('category');
        });
    }
}
