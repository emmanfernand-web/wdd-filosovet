<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class TransactionMoney
{
    public const MAX_CENTS = 999999999999999999;

    public static function cents(string|int|float $value): int
    {
        $text = (string) $value;
        if (! preg_match('/^(0|[1-9][0-9]{0,15})(?:\.([0-9]{1,2}))?$/D', $text, $parts)) {
            throw ValidationException::withMessages(['amount' => 'Invalid monetary precision or storage limit.']);
        }

        return (int) $parts[1] * 100 + (int) str_pad($parts[2] ?? '', 2, '0');
    }

    public static function format(int $value): string
    {
        return intdiv($value, 100).'.'.str_pad((string) ($value % 100), 2, '0', STR_PAD_LEFT);
    }

    public static function add(int $a, int $b): int
    {
        if ($a < 0 || $b < 0 || $a > self::MAX_CENTS - $b) {
            throw ValidationException::withMessages(['amount' => 'Total exceeds storage limit.']);
        }

        return $a + $b;
    }

    public static function line(int $quantity, int $price): int
    {
        if ($quantity < 1 || $price < 0 || ($price > 0 && $quantity > intdiv(self::MAX_CENTS, $price))) {
            throw ValidationException::withMessages(['items' => 'Total exceeds storage limit.']);
        }

        return $quantity * $price;
    }
}
