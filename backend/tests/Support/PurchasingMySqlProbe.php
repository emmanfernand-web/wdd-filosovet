<?php

use App\Models\Product;
use App\Models\PurchaseOrder;
use App\Models\Role;
use App\Models\User;
use App\Services\GoodsReceivingService;
use App\Services\PurchaseOrderService;
use App\Services\SupplierService;
use App\Support\InventoryBalance;
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

$prefix = 'q5_';
$config = config('database.connections.mysql');
$config['prefix'] = $prefix;
$config['prefix_indexes'] = true;
config(['database.connections.m5qa' => $config, 'database.default' => 'm5qa', 'cache.default' => 'array', 'session.driver' => 'array']);
DB::setDefaultConnection('m5qa');
function verify($condition, $message)
{
    if (! $condition) {
        throw new RuntimeException($message);
    }
}
if (($argv[1] ?? '') === 'worker') {
    $data = json_decode(file_get_contents($argv[2]), true);
    $start = microtime(true);
    try {
        [$receipt,$created] = app(GoodsReceivingService::class)->confirm(User::findOrFail($data['actor']), PurchaseOrder::findOrFail($data['po']), $data['payload']);
        echo json_encode(['result' => 'ok', 'id' => $receipt->id, 'created' => $created, 'elapsed' => microtime(true) - $start]);
    } catch (ValidationException $e) {
        echo json_encode(['result' => 'rejected', 'elapsed' => microtime(true) - $start]);
    }
    exit;
}
$existing = DB::select('SHOW TABLES');
foreach ($existing as $row) {
    verify(! str_starts_with(array_values((array) $row)[0], $prefix), 'Scratch prefix already exists; refusing to touch it.');
}
$created = [];
$results = [];
try {
    foreach (glob(getcwd().'/database/migrations/*.php') as $file) {
        $code = file_get_contents($file);
        $code = preg_replace('/^<\?php\s*/', '', $code);
        $code = preg_replace_callback("/'([a-z0-9_]+_(?:index|unique|foreign))'/", fn ($m) => "'".$prefix.$m[1]."'", $code);
        $migration = eval($code);
        $migration->up();
    }
    $tables = Schema::getTableListing();
    foreach ($tables as $table) {
        $short = str_contains($table, '.') ? substr($table, strrpos($table, '.') + 1) : $table;
        if (str_starts_with($short, $prefix)) {
            $created[] = substr($short, strlen($prefix));
        }
    }
    foreach ($created as $table) {
        foreach (Schema::getForeignKeys($table) as $fk) {
            verify(str_starts_with($fk['foreign_table'], $prefix), 'Scratch FK must not reference operational tables');
        }
    }
    (new DatabaseSeeder)->run();
    $actor = User::factory()->create();
    $actor->roles()->attach(Role::where('slug', 'inventory')->firstOrFail());
    $supplier = app(SupplierService::class)->save($actor, ['name' => 'ISOLATED QA']);
    $product = Product::create(['sku' => 'QA', 'name' => 'Isolated QA', 'type' => 'general', 'unit' => 'piece']);
    function makePO($actor, $supplier, $product)
    {
        $po = app(PurchaseOrderService::class)->save($actor, ['supplier_id' => $supplier->id, 'order_date' => now()->toDateString(), 'items' => [['product_id' => $product->id, 'quantity_ordered' => 10, 'unit_purchase_price' => '0.10']]]);

        return app(PurchaseOrderService::class)->transition($actor, $po, 'ordered');
    }
    function payloadFor($po, $quantity)
    {
        return ['idempotency_key' => (string) Str::uuid(), 'received_date' => now()->toDateString(), 'items' => [['purchase_order_item_id' => $po->items->first()->id, 'quantity' => $quantity]]];
    }
    $po = makePO($actor, $supplier, $product);
    $payload = payloadFor($po, 3);
    DB::beginTransaction();
    [$receipt] = app(GoodsReceivingService::class)->confirm($actor, $po, $payload);
    verify(DB::table('stock_movements')->count() === 1, 'Movement not posted');
    DB::rollBack();
    verify(DB::table('stock_movements')->count() === 0 && DB::table('goods_receivings')->count() === 0, 'Outer rollback not atomic');
    $results['nested_transaction_rollback'] = true;
    [$receipt] = app(GoodsReceivingService::class)->confirm($actor, $po, $payload);
    $row = DB::table('goods_receiving_items')->first();
    $constraintRejected = false;
    DB::beginTransaction();
    try {
        DB::table('goods_receiving_items')->insert(['goods_receiving_id' => $row->goods_receiving_id, 'purchase_order_id' => $row->purchase_order_id, 'purchase_order_item_id' => $row->purchase_order_item_id, 'product_id' => 99999999, 'quantity' => 1, 'actual_unit_price' => '1.00', 'subtotal' => '1.00']);
    } catch (QueryException) {
        $constraintRejected = true;
    } finally {
        DB::rollBack();
    }verify($constraintRejected, 'Composite/FK constraint not enforced');
    $results['mysql_fk_rejection'] = true;
    foreach (['over_receiving', 'same_request'] as $scenario) {
        $po = makePO($actor, $supplier, $product);
        $payload = payloadFor($po, $scenario === 'over_receiving' ? 7 : 10);
        $paths = [];
        $processes = [];
        DB::beginTransaction();
        PurchaseOrder::whereKey($po->id)->lockForUpdate()->firstOrFail();
        for ($i = 0; $i < 2; $i++) {
            $p = $payload;
            if ($scenario === 'over_receiving') {
                $p['idempotency_key'] = (string) Str::uuid();
            }$path = '/tmp/filosovet-m5-'.$scenario.'-'.$i.'.json';
            file_put_contents($path, json_encode(['actor' => $actor->id, 'po' => $po->id, 'payload' => $p]));
            $paths[] = $path;
            $pipes = [];
            $proc = proc_open([PHP_BINARY, __FILE__, 'worker', $path], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, getcwd());
            fclose($pipes[0]);
            $processes[] = [$proc, $pipes];
        }
        usleep(1200000);
        DB::commit();
        $out = [];
        foreach ($processes as [$proc,$pipes]) {
            $stdout = stream_get_contents($pipes[1]);
            $err = stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            $exit = proc_close($proc);
            verify($exit === 0, 'Worker failed: '.$err);
            $out[] = json_decode($stdout, true, 512, JSON_THROW_ON_ERROR);
        }
        $ok = array_values(array_filter($out, fn ($r) => $r['result'] === 'ok'));
        if ($scenario === 'over_receiving') {
            verify(count($ok) === 1, 'Over-receiving concurrency guard failed');
            verify((int) DB::table('goods_receiving_items')->where('purchase_order_id', $po->id)->sum('quantity') === 7, 'Concurrent remaining wrong');
        } else {
            verify(count($ok) === 2 && $ok[0]['id'] === $ok[1]['id'] && $ok[0]['created'] !== $ok[1]['created'], 'Duplicate receipt replay failed');
            verify(DB::table('goods_receivings')->where('purchase_order_id', $po->id)->count() === 1, 'Duplicate document persisted');
        }
        verify(min(array_column($out, 'elapsed')) > 0.5, 'Workers did not wait on PO lock');
        $results[$scenario] = $out;
    }
    $results['physical_stock'] = (int) InventoryBalance::products()->where('id', $product->id)->firstOrFail()->physical_stock;
    verify($results['physical_stock'] === 20, 'MySQL aggregate balance mismatch');
    $results['scratch_tables'] = count($created);
    $results['mysql_version'] = DB::selectOne('SELECT VERSION() AS version')->version;
} finally {
    while (DB::transactionLevel() > 0) {
        DB::rollBack();
    }
    // Only this run's isolated q5_ tables, never existing application tables.
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
            DB::statement('DROP TABLE `'.str_replace('`', '``', $name).'`');
        }
    } finally {
        Schema::enableForeignKeyConstraints();
    }
    $results['scratch_cleanup_count'] = count($owned);
}
file_put_contents('/tmp/filosovet-m5-mysql-qa-results.json', json_encode($results, JSON_PRETTY_PRINT));
echo json_encode($results, JSON_PRETTY_PRINT).PHP_EOL;
