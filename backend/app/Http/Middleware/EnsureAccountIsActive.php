<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        // Also handles users deactivated after a guard was already resolved.
        if ($user = $request->user()) {
            abort_unless($user->fresh()?->is_active, 403, 'Akun tidak aktif.');
        }

        return $next($request);
    }
}
