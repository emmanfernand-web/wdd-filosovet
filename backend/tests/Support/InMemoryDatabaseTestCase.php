<?php

namespace Tests\Support;

use Database\Seeders\AccessControlSeeder;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

abstract class InMemoryDatabaseTestCase extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'database.default' => 'access_testing',
            'database.connections.access_testing' => [
                'driver' => 'sqlite', 'database' => ':memory:',
                'prefix' => '', 'foreign_key_constraints' => true,
            ],
            'cache.default' => 'array',
            'session.driver' => 'array',
        ]);
        DB::purge('access_testing');
        $this->artisan('migrate', ['--database' => 'access_testing', '--force' => true])->assertSuccessful();
        $this->seed(AccessControlSeeder::class);
    }
}
