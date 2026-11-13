<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class PurchasingMoney
{
    public const MAX_CENTS = 999999999999999999;

    public static function cents(string|int|float $value): int
    {
        $parts = explode('.', (string) $value);

        return (int) $parts[0] * 100 + (int) str_pad($parts[1] ?? '', 2, '0');
    }

    public static function format(int $cents): string
    {
        return intdiv($cents, 100).'.'.str_pad((string) ($cents % 100), 2, '0', STR_PAD_LEFT);
    }

    public static function line(int $quantity, int $price): int
    {
        if ($price > 0 && $quantity > intdiv(self::MAX_CENTS, $price)) {
            throw ValidationException::withMessages(['items' => 'Monetary total exceeds storage limit.']);
        }

        return $quantity * $price;
    }

    public static function add(int $left, int $right): int
    {
        if ($left > self::MAX_CENTS - $right) {
            throw ValidationException::withMessages(['items' => 'Monetary total exceeds storage limit.']);
        }

        return $left + $right;
    }
}
