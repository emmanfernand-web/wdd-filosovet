<?php

namespace App\Support;

use Illuminate\Support\Str;

class BookingCodeGenerator
{
    public function generate(): string
    {
        return 'FV-'.Str::ulid();
    }
}
