<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Models\Booking;
use App\Models\Pet;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\User;
use App\Support\BookingCodeGenerator;
use App\Support\ServiceBookingValidation;
use Carbon\CarbonImmutable;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class BookingService
{
    public function __construct(private BookingCodeGenerator $codes) {}

    public function create(User $actor, array $input): Booking
    {
        Gate::forUser($actor)->authorize('create', Booking::class);
        $data = Validator::make($input, ServiceBookingValidation::booking())->validate();
        for ($attempt = 0; $attempt < 3; $attempt++) {
            try {
                return DB::transaction(function () use ($actor, $data) {
                    $pet = Pet::whereKey($data['pet_id'])->lockForUpdate()->firstOrFail();
                    if (! $actor->hasPermission('manage_bookings')) {
                        abort_unless($pet->customer->user_id === $actor->id, 403);
                    }
                    $service = $this->activeService($data['service_id']);
                    $start = CarbonImmutable::parse($data['scheduled_at'])->utc();
                    $end = $service->duration_minutes ? $start->addMinutes($service->duration_minutes) : null;
                    $this->ensureAvailable($pet->id, $start, $end);
                    $booking = new Booking;
                    $booking->forceFill(['booking_code' => $this->codes->generate(), 'customer_id' => $pet->customer_id,
                        'pet_id' => $pet->id, 'service_id' => $service->id, 'scheduled_at' => $start->format('Y-m-d H:i:s'),
                        'ends_at' => $end?->format('Y-m-d H:i:s'), 'price_snapshot' => $service->price,
                        'status' => BookingStatus::Pending, 'customer_notes' => $data['customer_notes'] ?? null, 'created_by' => $actor->id]);
                    $booking->save();

                    return $booking->refresh()->load(['customer', 'pet', 'service.category']);
                }, 3);
            } catch (UniqueConstraintViolationException $exception) {
                if (! str_contains($exception->getMessage(), 'booking_code')) {
                    throw $exception;
                }
                if ($attempt === 2) {
                    throw ValidationException::withMessages(['booking_code' => 'Unable to allocate a booking code. Retry the request.']);
                }
            }
        }
        throw new \LogicException('Booking code retry exhausted.');
    }

    public function update(User $actor, Booking $booking, array $input): Booking
    {
        Gate::forUser($actor)->authorize('update', $booking);
        $data = Validator::make($input, ServiceBookingValidation::booking(true))->validate();

        return $this->locked($actor, $booking, 'update', function (Booking $current) use ($data) {
            if (! in_array($current->status, [BookingStatus::Pending, BookingStatus::Confirmed], true) || $this->start($current)->lte(now()->utc())) {
                throw ValidationException::withMessages(['booking' => 'Only upcoming pending/confirmed bookings may be edited.']);
            }
            if (isset($data['scheduled_at'])) {
                if (! Pet::whereKey($current->pet_id)->exists()) {
                    throw ValidationException::withMessages(['pet_id' => 'Pet is archived.']);
                }
                $this->activeService($current->service_id);
                $start = CarbonImmutable::parse($data['scheduled_at'])->utc();
                // Preserve original booked interval rather than applying a later catalog duration change.
                $minutes = $current->ends_at ? $this->start($current)->diffInMinutes($this->end($current)) : null;
                $end = $minutes !== null ? $start->addMinutes($minutes) : null;
                $this->ensureAvailable($current->pet_id, $start, $end, $current->id);
                $current->scheduled_at = $start->format('Y-m-d H:i:s');
                $current->ends_at = $end?->format('Y-m-d H:i:s');
            }
            if (array_key_exists('customer_notes', $data)) {
                $current->customer_notes = $data['customer_notes'];
            }
            $current->save();
        });
    }

    public function transition(User $actor, Booking $booking, array $input): Booking
    {
        Gate::forUser($actor)->authorize('transition', $booking);
        $data = Validator::make($input, ['status' => ['required', Rule::enum(BookingStatus::class)]])->validate();

        return $this->locked($actor, $booking, 'transition', function (Booking $current) use ($data) {
            $next = BookingStatus::from($data['status']);
            if (! in_array($next, $current->status->next(), true)) {
                throw ValidationException::withMessages(['status' => 'Illegal booking status transition.']);
            }
            if ($next->blocksSchedule()) {
                $this->ensureAvailable($current->pet_id, $this->start($current), $this->end($current), $current->id);
            }
            $current->status = $next;
            $current->save();
        });
    }

    public function staffNotes(User $actor, Booking $booking, array $input): Booking
    {
        Gate::forUser($actor)->authorize('staffNotes', $booking);
        $data = Validator::make($input, ['staff_notes' => ['present', 'nullable', 'string', 'max:10000']])->validate();

        return $this->locked($actor, $booking, 'staffNotes', function (Booking $current) use ($data) {
            $current->staff_notes = $data['staff_notes'];
            $current->save();
        });
    }

    private function locked(User $actor, Booking $booking, string $ability, callable $operation): Booking
    {
        return DB::transaction(function () use ($actor, $booking, $ability, $operation) {
            // Same lock ordering as create, serializing all operations on this pet, including archives.
            Pet::withTrashed()->whereKey($booking->pet_id)->lockForUpdate()->firstOrFail();
            $current = Booking::whereKey($booking->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize($ability, $current);
            $operation($current);

            return $current->refresh()->load(['customer', 'pet', 'service.category']);
        }, 3);
    }

    private function activeService(int $id): Service
    {
        $service = Service::whereKey($id)->lockForUpdate()->firstOrFail();
        $category = ServiceCategory::whereKey($service->service_category_id)->lockForUpdate()->firstOrFail();
        if (! $service->is_active || ! $category->is_active) {
            throw ValidationException::withMessages(['service_id' => 'Service or category is inactive.']);
        }

        return $service;
    }

    private function start(Booking $booking): CarbonImmutable
    {
        return CarbonImmutable::parse($booking->getRawOriginal('scheduled_at'), 'UTC');
    }

    private function end(Booking $booking): ?CarbonImmutable
    {
        return $booking->getRawOriginal('ends_at') ? CarbonImmutable::parse($booking->getRawOriginal('ends_at'), 'UTC') : null;
    }

    private function ensureAvailable(int $petId, CarbonImmutable $start, ?CarbonImmutable $end, ?int $except = null): void
    {
        $active = [BookingStatus::Pending->value, BookingStatus::Confirmed->value, BookingStatus::CheckedIn->value, BookingStatus::InProgress->value];
        $query = Booking::where('pet_id', $petId)->whereIn('status', $active);
        if ($except) {
            $query->whereKeyNot($except);
        }
        // Locking read uses the latest committed rows under MySQL REPEATABLE READ.
        foreach ($query->lockForUpdate()->get() as $existing) {
            $otherStart = $this->start($existing);
            $otherEnd = $this->end($existing);
            $overlap = match (true) {
                $end === null && $otherEnd === null => $start->eq($otherStart),
                $end === null => $start->gte($otherStart) && $start->lt($otherEnd),
                $otherEnd === null => $otherStart->gte($start) && $otherStart->lt($end),
                default => $start->lt($otherEnd) && $end->gt($otherStart),
            };
            if ($overlap) {
                throw ValidationException::withMessages(['scheduled_at' => 'Pet already has an overlapping active booking.']);
            }
        }
    }
}
