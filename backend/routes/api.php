<?php

use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\InventoryCatalogController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\PetController;
use App\Http\Controllers\Api\ServiceCategoryController;
use App\Http\Controllers\Api\ServiceController;
use App\Http\Controllers\Api\StockMovementController;
use App\Models\Customer;
use Illuminate\Support\Facades\Route;

// The update action also serves /me, so bind customer IDs explicitly.
Route::model('customer', Customer::class);

// Future API authentication can select a different guard without changing domain services.
Route::prefix('v1')->middleware(['auth', 'active'])->group(function () {
    Route::get('me/customer', [CustomerController::class, 'me']);
    Route::patch('me/customer', [CustomerController::class, 'update']);
    Route::get('customers', [CustomerController::class, 'index']);
    Route::post('customers', [CustomerController::class, 'store']);
    Route::get('customers/{customer}', [CustomerController::class, 'show'])->whereNumber('customer');
    Route::patch('customers/{customer}', [CustomerController::class, 'update'])->whereNumber('customer');
    Route::get('customers/{customer}/pets', [PetController::class, 'index'])->whereNumber('customer');
    Route::post('customers/{customer}/pets', [PetController::class, 'store'])->whereNumber('customer');
    Route::get('pets/{pet}', [PetController::class, 'show'])->whereNumber('pet');
    Route::patch('pets/{pet}', [PetController::class, 'update'])->whereNumber('pet');
    Route::delete('pets/{pet}', [PetController::class, 'destroy'])->whereNumber('pet');
});

// Public read-only catalog; inactive authenticated accounts are still rejected.
Route::prefix('v1')->middleware('active')->group(function () {
    Route::get('service-categories', [ServiceCategoryController::class, 'index']);
    Route::get('service-categories/{category}', [ServiceCategoryController::class, 'show'])->whereNumber('category');
    Route::get('services', [ServiceController::class, 'index']);
    Route::get('services/{service}', [ServiceController::class, 'show'])->whereNumber('service');
});
Route::prefix('v1')->middleware(['auth', 'active'])->group(function () {
    Route::post('service-categories', [ServiceCategoryController::class, 'store']);
    Route::patch('service-categories/{category}', [ServiceCategoryController::class, 'update'])->whereNumber('category');
    Route::post('services', [ServiceController::class, 'store']);
    Route::patch('services/{service}', [ServiceController::class, 'update'])->whereNumber('service');
    Route::get('me/bookings', [BookingController::class, 'index'])->name('bookings.own');
    Route::get('bookings', [BookingController::class, 'index']);
    Route::post('bookings', [BookingController::class, 'store']);
    Route::get('bookings/{booking}', [BookingController::class, 'show'])->whereNumber('booking');
    Route::patch('bookings/{booking}', [BookingController::class, 'update'])->whereNumber('booking');
    Route::patch('bookings/{booking}/status', [BookingController::class, 'status'])->whereNumber('booking');
    Route::patch('bookings/{booking}/staff-notes', [BookingController::class, 'staffNotes'])->whereNumber('booking');
});

Route::prefix('v1')->middleware(['auth', 'active'])->controller(InventoryCatalogController::class)->group(function () {
    Route::get('product-categories', 'categories')->name('inventory.categories');
    Route::post('product-categories', 'storeCategory');
    Route::patch('product-categories/{category}', 'updateCategory')->whereNumber('category');
    Route::get('products', 'index');
    Route::post('products', 'store');
    Route::get('products/{product}', 'show')->whereNumber('product');
    Route::patch('products/{product}', 'update')->whereNumber('product');
    Route::get('products/{product}/batches', 'batches')->whereNumber('product')->name('inventory.batches');
    Route::post('products/{product}/batches', 'storeBatch')->whereNumber('product');
    Route::get('product-batches/{batch}', 'showBatch')->whereNumber('batch');
});

Route::prefix('v1')->middleware(['auth', 'active'])->group(function () {
    Route::post('stock-movements', [StockMovementController::class, 'store']);
});

Route::prefix('v1')->middleware(['auth', 'active'])->controller(InventoryController::class)->group(function () {
    Route::get('inventory/balances', 'balances');
    Route::get('inventory/low-stock', 'lowStock');
    Route::get('inventory/expired-batches', 'expiredBatches');
    Route::get('stock-movements', 'movements')->name('inventory.movements');
});
