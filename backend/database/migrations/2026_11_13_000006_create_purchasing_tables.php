<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $t) {
            $t->id();
            $t->string('name');
            $t->string('contact_name')->nullable();
            $t->string('email')->nullable();
            $t->string('phone', 50)->nullable();
            $t->text('address')->nullable();
            $t->text('notes')->nullable();
            $t->boolean('is_active')->default(true);
            $t->timestamps();
            $t->index(['is_active', 'name']);
        });
        Schema::create('purchase_orders', function (Blueprint $t) {
            $t->id();
            $t->string('po_number', 29)->unique();
            $t->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $t->date('order_date');
            $t->date('expected_delivery_date')->nullable();
            $t->string('status', 30)->default('draft');
            $t->text('notes')->nullable();
            $t->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $t->decimal('subtotal', 18, 2);
            $t->decimal('total', 18, 2);
            $t->timestamps();
            $t->index(['supplier_id', 'status', 'order_date']);
            $t->index(['status', 'order_date']);
        });
        Schema::create('purchase_order_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('purchase_order_id')->constrained()->restrictOnDelete();
            $t->foreignId('product_id')->constrained()->restrictOnDelete();
            $t->string('product_name');
            $t->string('product_type', 20);
            $t->string('unit', 50);
            $t->unsignedInteger('quantity_ordered');
            $t->decimal('unit_purchase_price', 18, 2);
            $t->decimal('subtotal', 18, 2);
            $t->timestamps();
            $t->unique(['purchase_order_id', 'product_id']);
            $t->unique(['purchase_order_id', 'id'], 'po_item_parent_unique');
            $t->unique(['id', 'product_id'], 'po_item_product_unique');
        });
        Schema::create('goods_receivings', function (Blueprint $t) {
            $t->id();
            $t->string('receiving_number', 29)->unique();
            $t->foreignId('purchase_order_id')->constrained()->restrictOnDelete();
            $t->uuid('idempotency_key')->unique();
            $t->char('payload_hash', 64);
            $t->date('received_date');
            $t->foreignId('received_by')->constrained('users')->restrictOnDelete();
            $t->text('notes')->nullable();
            $t->timestamps();
            $t->unique(['purchase_order_id', 'id'], 'receiving_parent_unique');
            $t->index(['purchase_order_id', 'received_date']);
        });
        Schema::create('goods_receiving_items', function (Blueprint $t) {
            $t->id();
            $t->foreignId('goods_receiving_id')->constrained()->restrictOnDelete();
            $t->unsignedBigInteger('purchase_order_id');
            $t->unsignedBigInteger('purchase_order_item_id');
            $t->foreign(['purchase_order_id', 'goods_receiving_id'], 'receiving_item_header_foreign')->references(['purchase_order_id', 'id'])->on('goods_receivings')->restrictOnDelete();
            $t->foreign(['purchase_order_id', 'purchase_order_item_id'], 'receiving_item_po_foreign')->references(['purchase_order_id', 'id'])->on('purchase_order_items')->restrictOnDelete();
            $t->foreignId('product_id')->constrained()->restrictOnDelete();
            $t->foreign(['purchase_order_item_id', 'product_id'], 'receipt_po_product_foreign')->references(['id', 'product_id'])->on('purchase_order_items')->restrictOnDelete();
            $t->unsignedBigInteger('product_batch_id')->nullable();
            $t->foreign(['product_id', 'product_batch_id'], 'receiving_item_batch_foreign')->references(['product_id', 'id'])->on('product_batches')->restrictOnDelete();
            $t->unsignedInteger('quantity');
            $t->decimal('actual_unit_price', 18, 2);
            $t->decimal('subtotal', 18, 2);
            $t->foreignId('stock_movement_id')->nullable()->unique()->constrained()->restrictOnDelete();
            $t->timestamps();
        });
    }

    public function down(): void
    {
        foreach (['goods_receiving_items', 'goods_receivings', 'purchase_order_items', 'purchase_orders', 'suppliers'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
