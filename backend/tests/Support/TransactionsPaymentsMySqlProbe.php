<?php

use App\Models\Booking;
use App\Models\Payment;
use App\Models\Pet;
use App\Models\Product;
use App\Models\Role;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\Transaction;
use App\Models\User;
use App\Services\InventoryService;
use App\Services\PaymentService;
use App\Services\TransactionService;
use App\Support\InventoryBalance;
use App\Support\TransactionSummary;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

require dirname(__DIR__, 2).'/vendor/autoload.php';
$app = require dirname(__DIR__, 2).'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$prefix = 'q6_';
$config = config('database.connections.mysql');
$config['prefix'] = $prefix;
$config['prefix_indexes'] = true;
config(['database.connections.m6qa' => $config, 'database.default' => 'm6qa', 'cache.default' => 'array', 'session.driver' => 'array']);
DB::setDefaultConnection('m6qa');
function checkQA(bool $condition, string $message): void
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}
if (($argv[1] ?? '') === 'worker') {
    $data = json_decode(file_get_contents($argv[2]), true, 512, JSON_THROW_ON_ERROR);
    $start = microtime(true);
    try {
        $actor = User::findOrFail($data['actor']);
        $created = true;
        if ($data['op'] === 'payment') {
            [$row,$created] = app(PaymentService::class)->record($actor, Transaction::findOrFail($data['transaction']), $data['payload']);
        } elseif ($data['op'] === 'refund') {
            [$row,$created] = app(PaymentService::class)->refund($actor, Payment::findOrFail($data['payment']), $data['payload']);
        } elseif ($data['op'] === 'create') {
            $row = app(TransactionService::class)->save($actor, $data['payload']);
        } elseif ($data['op'] === 'replace') {
            $row = app(TransactionService::class)->save($actor, $data['payload'], Transaction::findOrFail($data['transaction']));
        } else {
            $row = app(TransactionService::class)->transition($actor, Transaction::findOrFail($data['transaction']), $data['status'] ?? 'confirmed');
        }
        echo json_encode(['result' => 'ok', 'id' => $row->id, 'created' => $created, 'elapsed' => microtime(true) - $start]);
    } catch (ValidationException) {
        echo json_encode(['result' => 'rejected', 'elapsed' => microtime(true) - $start]);
    }
    exit;
}
foreach (DB::select('SHOW TABLES') as $row) {
    checkQA(! str_starts_with(array_values((array) $row)[0], $prefix), 'Scratch prefix exists; refusing to touch it.');
}
$results = [];
$paths = [];
$processes = [];
function startQA(array $data): array
{
    global $paths,$processes;
    $path = tempnam(sys_get_temp_dir(), 'filosovet-m6-');
    file_put_contents($path, json_encode($data));
    $paths[] = $path;
    $pipes = [];
    $process = proc_open([PHP_BINARY, __FILE__, 'worker', $path], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, getcwd());
    checkQA(is_resource($process), 'Cannot start worker');
    fclose($pipes[0]);
    $pair = [$process, $pipes];
    $processes[] = $pair;

    return $pair;
}
function finishQA(array $pair): array
{
    [$process,$pipes] = $pair;
    $stdout = stream_get_contents($pipes[1]);
    $stderr = stream_get_contents($pipes[2]);
    fclose($pipes[1]);
    fclose($pipes[2]);
    $exit = proc_close($process);
    checkQA($exit === 0, 'Worker failed: '.$stderr);

    return json_decode($stdout, true, 512, JSON_THROW_ON_ERROR);
}
function twoQA(array $a, array $b, callable $hold): array
{
    DB::beginTransaction();
    $hold();
    $first = startQA($a);
    $second = startQA($b);
    usleep(1200000);
    DB::commit();
    $out = [finishQA($first), finishQA($second)];
    checkQA(min(array_column($out, 'elapsed')) > 0.5, 'Workers did not wait on held row lock.');

    return $out;
}
try {
    foreach (glob(getcwd().'/database/migrations/*.php') as $file) {
        $code = preg_replace('/^<\?php\s*/', '', file_get_contents($file));
        $code = preg_replace_callback("/'([a-z0-9_]+_(?:index|unique|foreign))'/", fn ($m) => "'".$prefix.$m[1]."'", $code);
        $migration = eval($code);
        $migration->up();
    }
    $owned = [];
    foreach (Schema::getTableListing() as $table) {
        $short = substr($table, strrpos('.'.$table, '.'));
        if (str_starts_with($short, $prefix)) {
            $owned[] = substr($short, strlen($prefix));
        }
    }
    foreach ($owned as $table) {
        foreach (Schema::getForeignKeys($table) as $fk) {
            checkQA(str_starts_with($fk['foreign_table'], $prefix), 'Scratch FK references operational table.');
        }
    }
    (new DatabaseSeeder)->run();
    $actor = User::factory()->create();
    $actor->roles()->attach(Role::where('slug', 'admin')->firstOrFail());
    $customer = User::factory()->create()->customer()->create([]);
    $category = ServiceCategory::firstOrCreate(['slug' => 'qa'], ['name' => 'QA']);
    $service = Service::create(['service_category_id' => $category->id, 'name' => 'QA service', 'slug' => 'qa-service', 'price' => '100.00']);
    $product = Product::create(['sku' => 'QA', 'name' => 'QA product', 'type' => 'general', 'unit' => 'piece', 'selling_price' => '10.00']);
    $inventory = app(InventoryService::class);
    $inventory->record($actor, ['product_id' => $product->id, 'movement_type' => 'opening_stock', 'quantity' => 50, 'reason' => 'Isolated QA opening']);
    $create = function (array $items = [], ?Booking $booking = null) use ($actor, $customer) {
        return app(TransactionService::class)->save($actor, ['customer_id' => $customer->id, 'booking_id' => $booking?->id, 'transaction_date' => now('UTC')->toDateString(), 'items' => $items]);
    };
    $serviceLine = ['item_type' => 'service', 'service_id' => $service->id, 'quantity' => 1];
    $productLine = ['item_type' => 'product', 'product_id' => $product->id, 'quantity' => 1];
    $booking = function () use ($customer, $service) {
        $pet = $customer->pets()->create(['name' => 'QA pet', 'species' => 'cat']);
        $b = (new Booking)->forceFill(['booking_code' => 'FV-'.Str::ulid(), 'customer_id' => $customer->id, 'pet_id' => $pet->id, 'service_id' => $service->id, 'scheduled_at' => now()->addDay(), 'status' => 'pending', 'price_snapshot' => '100.00']);
        $b->save();

        return $b;
    };
    $pay = function (Transaction $tx, string $amount = '100.00') use ($actor) {
        return app(PaymentService::class)->record($actor, $tx, ['idempotency_key' => (string) Str::uuid(), 'payment_date' => now('UTC')->toDateString(), 'amount' => $amount, 'method' => 'cash', 'status' => 'succeeded'])[0];
    };
    // Regression: a snapshot opened before another connection posts allocations must not allow cancel.
    $b = $booking();
    $tx = $create([$productLine], $b);
    DB::beginTransaction();
    DB::table('transaction_stock_allocations')->count();
    $done = finishQA(startQA(['op' => 'confirm', 'actor' => $actor->id, 'transaction' => $tx->id]));
    checkQA($done['result'] === 'ok', 'Concurrent confirmation failed');
    $rejected = false;
    try {
        app(TransactionService::class)->transition($actor, $tx, 'cancelled');
    } catch (ValidationException) {
        $rejected = true;
    } finally {
        DB::rollBack();
    }
    checkQA($rejected, 'Stale snapshot allowed cancellation after stock deduction');
    $results['stale_snapshot_cancel_rejected'] = true;
    // Regression: current draft items replaced after snapshot must be visible to trusted sale writer.
    $tx = $create([$productLine]);
    DB::beginTransaction();
    DB::table('transaction_items')->count();
    $done = finishQA(startQA(['op' => 'replace', 'actor' => $actor->id, 'transaction' => $tx->id, 'payload' => ['items' => [array_replace($productLine, ['quantity' => 2])]]]));
    checkQA($done['result'] === 'ok', 'Draft replacement failed');
    try {
        app(TransactionService::class)->transition($actor, $tx, 'confirmed');
        $results['stale_snapshot_replaced_item_confirmed'] = true;
    } finally {
        DB::rollBack();
    }
    $before = DB::table('stock_movements')->count();
    $tx = $create([$productLine]);
    DB::beginTransaction();
    app(TransactionService::class)->transition($actor, $tx, 'confirmed');
    DB::rollBack();
    checkQA(DB::table('stock_movements')->count() === $before && Transaction::findOrFail($tx->id)->status === 'draft', 'Outer stock rollback failed');
    $results['stock_outer_rollback'] = true;
    $tx = $create([$serviceLine]);
    app(TransactionService::class)->transition($actor, $tx, 'confirmed');
    DB::beginTransaction();
    $pay($tx, '10.00');
    DB::rollBack();
    checkQA($tx->payments()->count() === 0, 'Outer payment rollback failed');
    $results['payment_outer_rollback'] = true;
    $bad = false;
    try {
        DB::table('payments')->insert(['transaction_id' => 999999, 'payment_method_id' => 1, 'method_snapshot' => 'cash', 'payment_number' => 'INVALID', 'idempotency_key' => (string) Str::uuid(), 'payload_hash' => str_repeat('0', 64), 'payment_date' => now()->toDateString(), 'amount' => '1.00', 'status' => 'succeeded', 'received_by' => $actor->id]);
    } catch (QueryException) {
        $bad = true;
    }checkQA($bad, 'Foreign key not enforced');
    $results['foreign_key_rejection'] = true;
    $a = $create([array_replace($productLine, ['quantity' => 30])]);
    $b = $create([array_replace($productLine, ['quantity' => 30])]);
    $results['concurrent_stock'] = twoQA(['op' => 'confirm', 'actor' => $actor->id, 'transaction' => $a->id], ['op' => 'confirm', 'actor' => $actor->id, 'transaction' => $b->id], fn () => Product::whereKey($product->id)->lockForUpdate()->firstOrFail());
    checkQA(count(array_filter($results['concurrent_stock'], fn ($r) => $r['result'] === 'ok')) === 1, 'Concurrent stock oversold');
    foreach (['concurrent_payment', 'same_payment_uuid', 'concurrent_refund', 'same_refund_uuid'] as $scenario) {
        $tx = $create([$serviceLine]);
        app(TransactionService::class)->transition($actor, $tx, 'confirmed');
        $data = ['actor' => $actor->id, 'transaction' => $tx->id];
        if (str_contains($scenario, 'refund')) {
            $payment = $pay($tx);
            $data += ['op' => 'refund', 'payment' => $payment->id, 'payload' => ['idempotency_key' => (string) Str::uuid(), 'refund_date' => now()->toDateString(), 'amount' => '70.00', 'reason' => 'QA refund']];
        } else {
            $data += ['op' => 'payment', 'payload' => ['idempotency_key' => (string) Str::uuid(), 'payment_date' => now()->toDateString(), 'amount' => '60.00', 'method' => 'cash', 'status' => 'succeeded']];
        }
        $second = $data;
        if (str_starts_with($scenario, 'concurrent')) {
            $second['payload']['idempotency_key'] = (string) Str::uuid();
        }
        $out = twoQA($data, $second, fn () => Transaction::whereKey($tx->id)->lockForUpdate()->firstOrFail());
        $ok = array_values(array_filter($out, fn ($r) => $r['result'] === 'ok'));
        if (str_starts_with($scenario, 'concurrent')) {
            checkQA(count($ok) === 1, 'Concurrent money cap failed');
        } else {
            checkQA(count($ok) === 2 && $ok[0]['id'] === $ok[1]['id'] && $ok[0]['created'] !== $ok[1]['created'], 'Money UUID replay failed');
        }
        $summary = TransactionSummary::calculate($tx);
        checkQA($summary['total_paid'] === (str_contains($scenario, 'refund') ? 3000 : 6000), 'Financial totals incorrect');
        $results[$scenario] = $out;
    }
    $b = $booking();
    $data = ['op' => 'create', 'actor' => $actor->id, 'payload' => ['customer_id' => $customer->id, 'booking_id' => $b->id, 'transaction_date' => now()->toDateString(), 'items' => []]];
    $out = twoQA($data, $data, function () use ($b) {
        Pet::whereKey($b->pet_id)->lockForUpdate()->firstOrFail();
        Booking::whereKey($b->id)->lockForUpdate()->firstOrFail();
    });
    checkQA(count(array_filter($out, fn ($r) => $r['result'] === 'ok')) === 1, 'Duplicate booking billed concurrently');
    $results['concurrent_booking'] = $out;
    $results['physical_stock'] = (int) InventoryBalance::products()->where('id', $product->id)->firstOrFail()->physical_stock;
    checkQA($results['physical_stock'] === 19, 'Stock aggregate mismatch');
    $results['scratch_tables'] = count($owned);
    $results['mysql_version'] = DB::selectOne('SELECT VERSION() AS version')->version;
} finally {
    while (DB::transactionLevel() > 0) {
        DB::rollBack();
    }
    // Prefix was verified absent before creation; clean only this run's scratch objects.
    $owned = [];
    foreach (DB::select('SHOW TABLES') as $row) {
        $name = array_values((array) $row)[0];
        if (str_starts_with($name, $prefix)) {
            $owned[] = $name;
        }
    }
    Schema::disableForeignKeyConstraints();
    try {
        foreach ($owned as $name) {
            DB::statement('DROP TABLE `'.str_replace('`','``',$name).'`');
        }
    } finally {
        Schema::enableForeignKeyConstraints();
    }
    foreach ($paths as $path) {
        if (is_file($path)) {
            unlink($path);
        }
    }
    $results['scratch_cleanup_count'] = count($owned);
}
file_put_contents('/tmp/filosovet-m6-mysql-qa-results.json',json_encode($results,JSON_PRETTY_PRINT));
echo json_encode($results,JSON_PRETTY_PRINT).PHP_EOL;
