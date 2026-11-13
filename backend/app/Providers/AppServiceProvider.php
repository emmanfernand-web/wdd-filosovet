<?php

namespace App\Providers;

use App\Auth\ActiveUserProvider;
use App\Models\Booking;
use App\Models\Customer;
use App\Models\Pet;
use App\Models\Product;
use App\Models\ProductBatch;
use App\Models\ProductCategory;
use App\Models\PurchaseOrder;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\StaffProfile;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Models\Transaction;
use App\Models\User;
use App\Policies\BookingPolicy;
use App\Policies\CustomerPolicy;
use App\Policies\PetPolicy;
use App\Policies\ProductBatchPolicy;
use App\Policies\ProductCategoryPolicy;
use App\Policies\ProductPolicy;
use App\Policies\PurchaseOrderPolicy;
use App\Policies\ServiceCategoryPolicy;
use App\Policies\ServicePolicy;
use App\Policies\StaffProfilePolicy;
use App\Policies\StockMovementPolicy;
use App\Policies\SupplierPolicy;
use App\Policies\TransactionPolicy;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Auth::provider('active-eloquent', fn ($app, array $config) => new ActiveUserProvider($app['hash'], $config['model']));

        Gate::before(function (User $user) {
            return $user->newQuery()->whereKey($user->id)->where('is_active', true)->exists() ? null : false;
        });

        // Permission names remain database-driven, including custom permissions.
        Gate::before(function (User $user, string $ability, array $arguments) {
            if ($arguments !== []) {
                return null; // Resource policies must always check ownership.
            }

            return $user->hasPermission($ability) ? true : null;
        });

        Gate::policy(Transaction::class, TransactionPolicy::class);
        Gate::policy(Supplier::class, SupplierPolicy::class);
        Gate::policy(PurchaseOrder::class, PurchaseOrderPolicy::class);
        Gate::policy(StockMovement::class, StockMovementPolicy::class);
        Gate::policy(Product::class, ProductPolicy::class);
        Gate::policy(ProductCategory::class, ProductCategoryPolicy::class);
        Gate::policy(ProductBatch::class, ProductBatchPolicy::class);
        Gate::policy(Booking::class, BookingPolicy::class);
        Gate::policy(Service::class, ServicePolicy::class);
        Gate::policy(ServiceCategory::class, ServiceCategoryPolicy::class);
        Gate::policy(Pet::class, PetPolicy::class);
        Gate::policy(Customer::class, CustomerPolicy::class);
        Gate::policy(StaffProfile::class, StaffProfilePolicy::class);
    }
}
