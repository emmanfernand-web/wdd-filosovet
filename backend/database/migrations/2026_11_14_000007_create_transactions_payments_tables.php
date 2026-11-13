<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', fn (Blueprint $t) => $t->decimal('selling_price', 18, 2)->nullable());
        Schema::create('transactions', function (Blueprint $t) {
            $t->id();
            $t->string('transaction_number', 29)->unique();
            $t->foreignId('customer_id')->constrained()->restrictOnDelete();
            $t->foreignId('booking_id')->nullable()->constrained()->restrictOnDelete();
            $t->foreignId('active_booking_id')->nullable()->unique()->constrained('bookings')->restrictOnDelete();
            $t->date('transaction_date');
            $t->string('status', 20)->default('draft');
            $t->decimal('subtotal', 18, 2)->default(0);
            $t->decimal('grand_total', 18, 2)->default(0);
            $t->text('notes')->nullable();
            $t->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $t->timestamps();
            $t->index(['customer_id', 'transaction_date']);
            $t->index(['status', 'transaction_date']);
        });
        Schema::create('transaction_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('transaction_id')->constrained()->restrictOnDelete();
            $t->string('item_type', 20);
            $t->foreignId('service_id')->nullable()->constrained()->restrictOnDelete();
            $t->foreignId('product_id')->nullable()->constrained()->restrictOnDelete();
            $t->boolean('from_booking')->default(false);
            $t->string('item_name');
            $t->text('description')->nullable();
            $t->string('product_type', 20)->nullable();
            $t->string('unit', 50)->nullable();
            $t->unsignedInteger('quantity');
            $t->decimal('unit_price', 18, 2);
            $t->decimal('subtotal', 18, 2);
            $t->timestamps();
            $t->unique(['transaction_id', 'service_id']);
            $t->unique(['transaction_id', 'product_id']);
            $t->unique(['id', 'product_id'], 'sale_item_product_unique');
        });
        Schema::create('transaction_stock_allocations', function (Blueprint $t) {
            $t->id();
            $t->foreignId('transaction_item_id')->constrained()->restrictOnDelete();
            $t->foreignId('product_id')->constrained()->restrictOnDelete();
            $t->foreign(['transaction_item_id', 'product_id'], 'sale_allocation_item_foreign')->references(['id', 'product_id'])->on('transaction_items')->restrictOnDelete();
            $t->unsignedBigInteger('product_batch_id')->nullable();
            $t->foreign(['product_id', 'product_batch_id'], 'sale_allocation_batch_foreign')->references(['product_id', 'id'])->on('product_batches')->restrictOnDelete();
            $t->unsignedInteger('quantity');
            $t->foreignId('stock_movement_id')->nullable()->unique()->constrained()->restrictOnDelete();
            $t->timestamps();
        });
        Schema::create('payment_methods', function (Blueprint $t) {
            $t->id();
            $t->string('code', 50)->unique();
            $t->string('name');
            $t->boolean('is_active')->default(true);
            $t->timestamps();
        });
        Schema::create('payments', function (Blueprint $t) {
            $t->id();
            $t->string('payment_number', 29)->unique();
            $t->foreignId('transaction_id')->constrained()->restrictOnDelete();
            $t->foreignId('payment_method_id')->constrained()->restrictOnDelete();
            $t->string('method_snapshot', 50);
            $t->uuid('idempotency_key')->unique();
            $t->char('payload_hash', 64);
            $t->date('payment_date');
            $t->decimal('amount', 18, 2);
            $t->string('status', 20);
            $t->string('reference_number')->nullable();
            $t->text('notes')->nullable();
            $t->foreignId('received_by')->constrained('users')->restrictOnDelete();
            $t->timestamps();
            $t->unique(['transaction_id', 'id'], 'payment_parent_unique');
            $t->index(['transaction_id', 'payment_date']);
        });
        Schema::create('payment_refunds', function (Blueprint $t) {
            $t->id();
            $t->string('refund_number', 29)->unique();
            $t->foreignId('payment_id')->constrained()->restrictOnDelete();
            $t->unsignedBigInteger('transaction_id');
            $t->foreign(['transaction_id', 'payment_id'], 'refund_payment_parent_foreign')->references(['transaction_id', 'id'])->on('payments')->restrictOnDelete();
            $t->uuid('idempotency_key')->unique();
            $t->char('payload_hash', 64);
            $t->date('refund_date');
            $t->decimal('amount', 18, 2);
            $t->text('reason');
            $t->foreignId('refunded_by')->constrained('users')->restrictOnDelete();
            $t->timestamps();
            $t->index(['transaction_id', 'refund_date']);
        });
    }

    public function down(): void
    {
        foreach (['payment_refunds', 'payments', 'payment_methods', 'transaction_stock_allocations', 'transaction_items', 'transactions'] as $table) {
            Schema::dropIfExists($table);
        }
        Schema::table('products', fn (Blueprint $t) => $t->dropColumn('selling_price'));
    }
};
