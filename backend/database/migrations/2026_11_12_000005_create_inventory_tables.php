<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_category_id')->nullable()->constrained()->restrictOnDelete();
            $table->string('sku', 100)->unique();
            $table->string('name');
            $table->string('type', 20);
            $table->text('description')->nullable();
            $table->string('unit', 50);
            $table->unsignedInteger('minimum_stock')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['type', 'is_active']);
        });
        Schema::create('product_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->string('batch_number', 100);
            $table->date('expiry_date');
            $table->date('received_date')->nullable();
            $table->timestamps();
            $table->unique(['product_id', 'batch_number']);
            $table->unique(['product_id', 'id'], 'batch_product_id_unique');
            $table->index(['expiry_date', 'product_id']);
            $table->index(['product_id', 'expiry_date', 'id'], 'batch_fefo_index');
        });
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->unsignedBigInteger('product_batch_id')->nullable();
            $table->foreign(['product_id', 'product_batch_id'], 'movement_product_batch_foreign')
                ->references(['product_id', 'id'])->on('product_batches')->restrictOnDelete();
            $table->string('movement_type', 50);
            $table->string('direction', 3);
            $table->unsignedInteger('quantity');
            $table->text('reason');
            $table->string('reference_type', 100)->nullable();
            $table->unsignedBigInteger('reference_id')->nullable();
            $table->foreignId('performed_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('created_at');
            $table->index(['product_id', 'product_batch_id', 'id'], 'movement_bucket_index');
            $table->index(['product_batch_id', 'id'], 'movement_batch_index');
            $table->index(['movement_type', 'created_at']);
            $table->index(['product_id', 'created_at']);
            $table->index(['reference_type', 'reference_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('product_batches');
        Schema::dropIfExists('products');
        Schema::dropIfExists('product_categories');
    }
};
