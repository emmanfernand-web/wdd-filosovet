<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->string('species', 100);
            $table->string('breed')->nullable();
            $table->string('gender', 20)->nullable();
            $table->date('date_of_birth')->nullable();
            $table->decimal('weight', 8, 3)->nullable();
            $table->string('color', 100)->nullable();
            $table->string('microchip_number', 100)->nullable()->unique();
            $table->text('notes')->nullable();
            $table->timestamps();
            // Archive pets without discarding identities needed by future clinical records.
            $table->softDeletes();
            $table->index(['customer_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pets');
    }
};
