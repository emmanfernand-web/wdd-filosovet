<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Permission;
use App\Models\Pet;
use App\Models\Role;
use App\Models\Service;
use App\Models\ServiceCategory;
use App\Models\User;
use App\Services\BookingService;
use App\Support\BookingCodeGenerator;
use Database\Seeders\ServiceBookingSeeder;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\Support\InMemoryDatabaseTestCase;

class ServiceBookingManagementTest extends InMemoryDatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->startOfDay());
        $this->seed(ServiceBookingSeeder::class);
    }

    private function user(string $slug = 'customer'): User
    {
        $user = User::factory()->create();
        $user->roles()->attach(Role::where('slug', $slug)->firstOrFail());

        return $user;
    }

    private function pet(?User $owner = null): Pet
    {
        $customer = ($owner ?? $this->user())->customer()->create([]);

        return $customer->pets()->create(['name' => 'Milo', 'species' => 'cat']);
    }

    private function service(string $category = 'klinik-dokter', array $overrides = []): Service
    {
        return Service::create(array_merge([
            'service_category_id' => ServiceCategory::where('slug', $category)->value('id'),
            'name' => 'Test Service', 'slug' => 'test-'.fake()->unique()->uuid(),
            'price' => '150000.00', 'duration_minutes' => 30,
        ], $overrides));
    }

    private function payload(Pet $pet, Service $service, int $hours = 24): array
    {
        return ['pet_id' => $pet->id, 'service_id' => $service->id, 'scheduled_at' => now()->addHours($hours)->toIso8601String()];
    }

    private function booking(User $owner, Pet $pet, Service $service, array $overrides = []): Booking
    {
        $booking = app(BookingService::class)->create($owner, $this->payload($pet, $service));
        if ($overrides !== []) {
            $booking->forceFill($overrides)->save();
        }

        return $booking;
    }

    public function test_public_catalog_only_shows_active_categories_and_services(): void
    {
        $active = $this->service();
        $this->service(overrides: ['is_active' => false]);
        $category = ServiceCategory::where('slug', 'grooming')->firstOrFail();
        $this->service('grooming');
        $category->update(['is_active' => false]);
        $this->getJson('/api/v1/services')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $active->id);
        $this->getJson('/api/v1/service-categories')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/service-categories/'.$category->id)->assertNotFound();
        $this->getJson('/api/v1/services?is_active=0')->assertForbidden();
    }

    public function test_manager_can_create_update_and_deactivate_catalog(): void
    {
        $category = ServiceCategory::where('slug', 'grooming')->firstOrFail();
        $this->actingAs($this->user('admin'));
        $response = $this->postJson('/api/v1/services', ['service_category_id' => $category->id, 'name' => 'Custom', 'slug' => 'custom', 'price' => '120000.50', 'duration_minutes' => null])
            ->assertCreated()->assertJsonPath('data.price', '120000.50');
        $id = $response->json('data.id');
        $this->patchJson('/api/v1/services/'.$id, ['is_active' => false])->assertOk();
        $this->getJson('/api/v1/services?is_active=0&service_category_id='.$category->id)->assertJsonCount(1, 'data');
        $this->postJson('/api/v1/service-categories', ['name' => 'Other', 'slug' => 'other'])->assertCreated();
        $this->patchJson('/api/v1/service-categories/'.$category->id, ['is_active' => false])->assertOk();
    }

    public function test_catalog_permission_is_not_implicit_in_booking_or_inventory_permissions(): void
    {
        $service = $this->service();
        foreach (['customer', 'resepsionis', 'inventory', 'dokter', 'groomer', 'hotel', 'pharmacist', 'kasir'] as $role) {
            $this->actingAs($this->user($role))->postJson('/api/v1/services', [])->assertForbidden();
            $this->patchJson('/api/v1/services/'.$service->id, ['price' => 0])->assertForbidden();
        }
    }

    public function test_service_validation_rejects_invalid_category_slug_price_and_duration(): void
    {
        $existing = $this->service();
        $this->actingAs($this->user('admin'))->postJson('/api/v1/services', [
            'service_category_id' => 999999, 'name' => '', 'slug' => $existing->slug, 'price' => -1, 'duration_minutes' => 0,
        ])->assertUnprocessable()->assertJsonValidationErrors(['service_category_id', 'name', 'slug', 'price', 'duration_minutes']);
        $this->patchJson('/api/v1/services/'.$existing->id, ['price' => '1.234', 'duration_minutes' => -5])->assertUnprocessable();
    }

    public function test_inactive_category_cannot_be_used_for_new_service(): void
    {
        $category = ServiceCategory::where('slug', 'grooming')->firstOrFail();
        $category->update(['is_active' => false]);
        $this->actingAs($this->user('admin'))->postJson('/api/v1/services', ['service_category_id' => $category->id, 'name' => 'X', 'slug' => 'x', 'price' => 0])->assertUnprocessable();
    }

    public function test_customer_creates_booking_with_server_code_owner_price_and_duration(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $service = $this->service();
        $response = $this->actingAs($owner)->postJson('/api/v1/bookings', $this->payload($pet, $service))
            ->assertCreated()->assertJsonPath('data.customer_id', $pet->customer_id)->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.price_snapshot', '150000.00')->assertJsonMissingPath('data.staff_notes')->assertJsonMissingPath('data.created_by');
        $booking = Booking::findOrFail($response->json('data.id'));
        $this->assertMatchesRegularExpression('/^FV-[0-9A-HJKMNP-TV-Z]{26}$/', $booking->booking_code);
        $this->assertSame(30, (int) $booking->scheduled_at->diffInMinutes($booking->ends_at));
        $this->assertTrue($booking->customer->user->is($owner));
        $this->assertTrue($booking->pet->is($pet));
        $this->assertTrue($booking->service->is($service));
        $this->assertTrue($booking->creator->is($owner));
    }

    public function test_foreign_pet_archived_pet_and_forged_internal_fields_are_rejected(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $other = $this->pet();
        $service = $this->service();
        $this->actingAs($owner)->postJson('/api/v1/bookings', $this->payload($other, $service))->assertForbidden();
        $payload = $this->payload($pet, $service) + ['customer_id' => $other->customer_id, 'booking_code' => 'FORGED', 'status' => 'confirmed', 'staff_notes' => 'hidden', 'created_by' => 1, 'price_snapshot' => 0, 'ends_at' => now()->addDays(3)->toIso8601String()];
        $this->postJson('/api/v1/bookings', $payload)->assertUnprocessable()->assertJsonValidationErrors(['customer_id', 'booking_code', 'status', 'staff_notes', 'created_by', 'price_snapshot', 'ends_at']);
        $pet->delete();
        $this->postJson('/api/v1/bookings', $this->payload($pet, $service))->assertUnprocessable()->assertJsonValidationErrors('pet_id');
        $this->assertSame(0, Booking::count());
    }

    public function test_inactive_service_and_category_cannot_be_booked(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $service = $this->service();
        $this->actingAs($owner);
        $service->update(['is_active' => false]);
        $this->postJson('/api/v1/bookings', $this->payload($pet, $service))->assertUnprocessable();
        $service->update(['is_active' => true]);
        $service->category->update(['is_active' => false]);
        $this->postJson('/api/v1/bookings', $this->payload($pet, $service))->assertUnprocessable();
    }

    public function test_booking_schedule_requires_future_time_with_timezone_and_unknown_duration_remains_null(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $service = $this->service(overrides: ['duration_minutes' => null]);
        $this->actingAs($owner);
        foreach ([now()->subMinute()->toIso8601String(), now()->addDay()->format('Y-m-d H:i:s'), '2027-02-30T10:00:00+07:00'] as $date) {
            $this->postJson('/api/v1/bookings', array_merge($this->payload($pet, $service), ['scheduled_at' => $date]))->assertUnprocessable()->assertJsonValidationErrors('scheduled_at');
        }
        $this->postJson('/api/v1/bookings', $this->payload($pet, $service))->assertCreated()->assertJsonPath('data.ends_at', null);
    }

    public function test_customer_reads_only_own_bookings_and_staff_notes_are_hidden(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $booking = $this->booking($owner, $pet, $this->service(), ['staff_notes' => 'Internal']);
        $other = $this->user();
        $otherPet = $this->pet($other);
        $otherBooking = $this->booking($other, $otherPet, $this->service());
        $this->actingAs($owner)->getJson('/api/v1/me/bookings')->assertOk()->assertJsonCount(1, 'data')->assertJsonMissingPath('data.0.staff_notes');
        $this->getJson('/api/v1/bookings/'.$otherBooking->id)->assertForbidden();
        $this->patchJson('/api/v1/bookings/'.$otherBooking->id, ['customer_notes' => 'hack'])->assertForbidden();
        $this->getJson('/api/v1/bookings/'.$booking->id)->assertOk()->assertJsonMissingPath('data.staff_notes');
        $this->getJson('/api/v1/bookings')->assertForbidden();
    }

    public function test_customer_patch_preserves_internal_fields_and_snapshot(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $booking = $this->booking($owner, $pet, $this->service());
        $this->actingAs($owner)->patchJson('/api/v1/bookings/'.$booking->id, ['customer_notes' => 'Arriving later', 'scheduled_at' => now()->addDays(2)->toIso8601String()])->assertOk();
        $this->patchJson('/api/v1/bookings/'.$booking->id, ['status' => 'cancelled', 'staff_notes' => 'hack', 'service_id' => $booking->service_id, 'price_snapshot' => 0])->assertUnprocessable()->assertJsonValidationErrors(['status', 'staff_notes', 'service_id', 'price_snapshot']);
        $this->patchJson('/api/v1/bookings/'.$booking->id.'/status', ['status' => 'confirmed'])->assertForbidden();
        $this->patchJson('/api/v1/bookings/'.$booking->id.'/staff-notes', ['staff_notes' => 'hack'])->assertForbidden();
        $this->assertSame('150000.00', $booking->fresh()->price_snapshot);
    }

    public function test_pet_overlap_and_half_open_boundaries_work_across_services(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $service = $this->service();
        $this->booking($owner, $pet, $service);
        $this->actingAs($owner)->postJson('/api/v1/bookings', $this->payload($pet, $this->service('grooming')))->assertUnprocessable()->assertJsonValidationErrors('scheduled_at');
        $this->postJson('/api/v1/bookings', array_merge($this->payload($pet, $service), ['scheduled_at' => now()->addDay()->addMinutes(30)->toIso8601String()]))->assertCreated();
        $otherPet = $pet->customer->pets()->create(['name' => 'Other', 'species' => 'cat']);
        $this->postJson('/api/v1/bookings', $this->payload($otherPet, $service))->assertCreated();
    }

    public function test_null_duration_overlap_is_a_point_not_invented_occupancy(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $service = $this->service(overrides: ['duration_minutes' => null]);
        $this->booking($owner, $pet, $service);
        $this->actingAs($owner)->postJson('/api/v1/bookings', $this->payload($pet, $service))->assertUnprocessable();
        $this->postJson('/api/v1/bookings', $this->payload($pet, $service, 25))->assertCreated();
    }

    public function test_cancelled_no_show_and_completed_do_not_block_pet_schedule(): void
    {
        foreach (['cancelled', 'no_show', 'completed'] as $status) {
            $owner = $this->user();
            $pet = $this->pet($owner);
            $service = $this->service();
            $this->booking($owner, $pet, $service, ['status' => $status]);
            $this->actingAs($owner)->postJson('/api/v1/bookings', $this->payload($pet, $service))->assertCreated();
        }
    }

    public function test_lifecycle_enforces_every_allowed_and_disallowed_transition(): void
    {
        $transitions = ['pending' => ['confirmed', 'cancelled'], 'confirmed' => ['checked_in', 'cancelled', 'no_show'], 'checked_in' => ['in_progress', 'cancelled'], 'in_progress' => ['completed'], 'completed' => [], 'cancelled' => [], 'no_show' => []];
        $admin = $this->user('admin');
        $this->actingAs($admin);
        foreach ($transitions as $from => $allowed) {
            foreach (array_keys($transitions) as $to) {
                $owner = $this->user();
                $pet = $this->pet($owner);
                $booking = $this->booking($owner, $pet, $this->service(), ['status' => $from]);
                $response = $this->patchJson('/api/v1/bookings/'.$booking->id.'/status', ['status' => $to]);
                if (in_array($to, $allowed, true)) {
                    $response->assertOk()->assertJsonPath('data.status', $to);
                } else {
                    $response->assertUnprocessable()->assertJsonValidationErrors('status');
                }
            }
        }
    }

    public function test_staff_booking_views_are_scoped_by_capability_category_without_role_checks(): void
    {
        $ids = [];
        foreach (['klinik-dokter', 'grooming', 'pet-hotel'] as $category) {
            $owner = $this->user();
            $pet = $this->pet($owner);
            $ids[$category] = $this->booking($owner, $pet, $this->service($category), ['staff_notes' => 'Staff context'])->id;
        }
        foreach (['dokter' => 'klinik-dokter', 'groomer' => 'grooming', 'hotel' => 'pet-hotel'] as $role => $category) {
            $this->actingAs($this->user($role))->getJson('/api/v1/bookings')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $ids[$category])->assertJsonPath('data.0.staff_notes', 'Staff context');
            $foreign = $ids[$category === 'grooming' ? 'pet-hotel' : 'grooming'];
            $this->getJson('/api/v1/bookings/'.$foreign)->assertForbidden();
            $this->patchJson('/api/v1/bookings/'.$ids[$category].'/status', ['status' => 'confirmed'])->assertForbidden();
        }
        $this->actingAs($this->user('resepsionis'))->getJson('/api/v1/bookings')->assertJsonCount(3, 'data');
    }

    public function test_staff_can_create_for_pet_owner_and_manage_private_notes(): void
    {
        $pet = $this->pet();
        $service = $this->service();
        $staff = $this->user('resepsionis');
        $response = $this->actingAs($staff)->postJson('/api/v1/bookings', $this->payload($pet, $service))->assertCreated()->assertJsonPath('data.customer_id', $pet->customer_id);
        $id = $response->json('data.id');
        $this->patchJson('/api/v1/bookings/'.$id.'/staff-notes', ['staff_notes' => 'Checked documents'])->assertOk()->assertJsonPath('data.staff_notes', 'Checked documents');
        $this->patchJson('/api/v1/bookings/'.$id.'/status', ['status' => 'confirmed'])->assertOk();
    }

    public function test_historical_snapshot_survives_price_deactivation_and_pet_archival(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $service = $this->service();
        $booking = $this->booking($owner, $pet, $service);
        $this->actingAs($this->user('admin'))->patchJson('/api/v1/services/'.$service->id, ['price' => '999999.99', 'is_active' => false])->assertOk();
        $pet->delete();
        $this->actingAs($owner)->getJson('/api/v1/bookings/'.$booking->id)->assertOk()->assertJsonPath('data.price_snapshot', '150000.00');
        $this->assertTrue($booking->fresh()->pet->trashed());
    }

    public function test_booking_code_collision_is_retried_without_duplicate_booking(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $service = $this->service();
        $booking = $this->booking($owner, $pet, $service);
        $generator = $this->mock(BookingCodeGenerator::class);
        $generator->shouldReceive('generate')->twice()->andReturn($booking->booking_code, 'FV-01ARZ3NDEKTSV4RRFFQ69G5FAV');
        $this->actingAs($owner)->postJson('/api/v1/bookings', $this->payload($pet, $service, 26))->assertCreated()->assertJsonPath('data.booking_code', 'FV-01ARZ3NDEKTSV4RRFFQ69G5FAV');
        $this->assertSame(2, Booking::count());
    }

    public function test_booking_references_prevent_destructive_service_deletion(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $service = $this->service();
        $this->booking($owner, $pet, $service);
        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('FOREIGN KEY constraint failed');
        $service->delete();
    }

    public function test_category_reference_prevents_destructive_deletion(): void
    {
        $service = $this->service();
        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('FOREIGN KEY constraint failed');
        $service->category->delete();
    }

    public function test_lists_validate_pagination_and_filter_status_category_dates(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $service = $this->service();
        $this->booking($owner, $pet, $service);
        $this->actingAs($this->user('resepsionis'))->getJson('/api/v1/bookings?status=confirmed')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/bookings?service_category_id='.$service->service_category_id.'&per_page=1')->assertOk()->assertJsonPath('meta.per_page', 1)->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/bookings?status=bad')->assertUnprocessable();
        $this->getJson('/api/v1/bookings?per_page=101')->assertUnprocessable();
        $this->getJson('/api/v1/services?per_page=101')->assertUnprocessable();
    }

    public function test_reseeding_preserves_manual_grants_category_edits_and_revocations(): void
    {
        $category = ServiceCategory::where('slug', 'grooming')->firstOrFail();
        $category->update(['name' => 'Edited', 'is_active' => false]);
        $permission = Permission::where('slug', 'manage_services')->firstOrFail();
        $admin = Role::where('slug', 'admin')->firstOrFail();
        $admin->permissions()->detach($permission);
        $this->seed(ServiceBookingSeeder::class);
        $this->seed(ServiceBookingSeeder::class);
        $this->assertSame(3, ServiceCategory::count());
        $this->assertSame('Edited', $category->fresh()->name);
        $this->assertFalse($category->fresh()->is_active);
        $this->assertFalse($admin->permissions()->whereKey($permission->id)->exists());
    }

    public function test_service_calls_also_deny_foreign_booking_mutations(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $booking = $this->booking($owner, $pet, $this->service());
        $this->expectException(AuthorizationException::class);
        app(BookingService::class)->update($this->user(), $booking, ['customer_notes' => 'hack']);
    }

    public function test_guest_booking_routes_and_inactive_accounts_are_denied(): void
    {
        $this->get('/api/v1/me/bookings')->assertUnauthorized();
        $user = $this->user('admin');
        $user->forceFill(['is_active' => false])->save();
        $this->actingAs($user)->getJson('/api/v1/bookings')->assertForbidden();
        $this->getJson('/api/v1/services')->assertForbidden();
    }

    public function test_rescheduling_rejects_overlap_and_preserves_booked_duration_after_catalog_change(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $service = $this->service();
        $first = $this->booking($owner, $pet, $service);
        $second = app(BookingService::class)->create($owner, $this->payload($pet, $service, 26));
        $service->update(['duration_minutes' => 90]);
        $this->actingAs($owner)->patchJson('/api/v1/bookings/'.$second->id, ['scheduled_at' => $first->scheduled_at->toIso8601String()])->assertUnprocessable();
        $this->patchJson('/api/v1/bookings/'.$second->id, ['scheduled_at' => now()->addDays(3)->toIso8601String()])->assertOk();
        $second->refresh();
        $this->assertSame(30, (int) $second->scheduled_at->diffInMinutes($second->ends_at));
    }

    public function test_terminal_and_started_bookings_cannot_be_customer_edited(): void
    {
        foreach (['checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'] as $status) {
            $owner = $this->user();
            $pet = $this->pet($owner);
            $booking = $this->booking($owner, $pet, $this->service(), ['status' => $status]);
            $this->actingAs($owner)->patchJson('/api/v1/bookings/'.$booking->id, ['customer_notes' => 'No'])->assertUnprocessable();
        }
    }

    public function test_offsets_are_normalized_to_utc_and_equivalent_instants_conflict(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $service = $this->service();
        $instant = now()->addDay()->setTime(3, 0);
        $this->actingAs($owner)->postJson('/api/v1/bookings', array_merge($this->payload($pet, $service), ['scheduled_at' => $instant->copy()->setTimezone('Asia/Jakarta')->toIso8601String()]))
            ->assertCreated()->assertJsonPath('data.scheduled_at', $instant->copy()->utc()->toIso8601String());
        $this->postJson('/api/v1/bookings', array_merge($this->payload($pet, $service), ['scheduled_at' => $instant->copy()->utc()->toIso8601String()]))->assertUnprocessable();
    }

    public function test_unknown_duration_points_conflict_inside_known_intervals_in_both_directions(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $known = $this->service();
        $unknown = $this->service(overrides: ['duration_minutes' => null]);
        $this->booking($owner, $pet, $known);
        $this->actingAs($owner)->postJson('/api/v1/bookings', array_merge($this->payload($pet, $unknown), ['scheduled_at' => now()->addDay()->addMinutes(15)->toIso8601String()]))->assertUnprocessable();
        $other = $this->pet($this->user());
        $otherOwner = $other->customer->user;
        $this->booking($otherOwner, $other, $unknown);
        $this->actingAs($otherOwner)->postJson('/api/v1/bookings', array_merge($this->payload($other, $known), ['scheduled_at' => now()->addDay()->subMinutes(15)->toIso8601String()]))->assertUnprocessable();
    }

    public function test_referenced_category_slug_and_booked_service_category_cannot_change(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $service = $this->service();
        $this->booking($owner, $pet, $service);
        $this->actingAs($this->user('admin'))->patchJson('/api/v1/service-categories/'.$service->service_category_id, ['slug' => 'changed'])->assertUnprocessable();
        $this->patchJson('/api/v1/services/'.$service->id, ['service_category_id' => ServiceCategory::where('slug', 'grooming')->value('id')])->assertUnprocessable();
    }

    public function test_category_slug_uniqueness_and_required_fields_are_validated(): void
    {
        $this->actingAs($this->user('admin'))->postJson('/api/v1/service-categories', ['name' => 'Duplicate', 'slug' => 'grooming'])->assertUnprocessable()->assertJsonValidationErrors('slug');
        $this->postJson('/api/v1/service-categories', ['name' => '', 'slug' => 'bad slug'])->assertUnprocessable()->assertJsonValidationErrors(['name', 'slug']);
    }

    public function test_booking_foreign_keys_and_code_uniqueness_are_database_enforced(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $booking = $this->booking($owner, $pet, $this->service());
        $this->expectException(QueryException::class);
        $copy = $booking->replicate();
        $copy->save();
    }

    public function test_booking_foreign_key_rejects_orphan_service(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $booking = $this->booking($owner, $pet, $this->service());
        $this->expectException(QueryException::class);
        $this->expectExceptionMessage('FOREIGN KEY constraint failed');
        DB::table('bookings')->where('id', $booking->id)->update(['service_id' => 999999]);
    }

    public function test_date_filters_and_empty_own_listing_without_profile_work(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $this->booking($owner, $pet, $this->service());
        $this->actingAs($owner)->getJson('/api/v1/me/bookings?from='.now()->addDays(2)->toDateString())->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/me/bookings?to='.now()->toDateString())->assertOk()->assertJsonCount(0, 'data');
        $this->actingAs($this->user())->getJson('/api/v1/me/bookings')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_stale_booking_instances_cannot_revert_a_terminal_status(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $booking = $this->booking($owner, $pet, $this->service());
        $stale = $booking->fresh();
        $actor = $this->user('admin');
        app(BookingService::class)->transition($actor, $booking, ['status' => 'cancelled']);
        $this->expectException(ValidationException::class);
        app(BookingService::class)->transition($actor, $stale, ['status' => 'confirmed']);
    }

    public function test_null_or_omitted_notes_are_distinct_on_patch(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $booking = $this->booking($owner, $pet, $this->service(), ['customer_notes' => 'Original']);
        $this->actingAs($owner)->patchJson('/api/v1/bookings/'.$booking->id, [])->assertOk()->assertJsonPath('data.customer_notes', 'Original');
        $this->patchJson('/api/v1/bookings/'.$booking->id, ['customer_notes' => null])->assertOk()->assertJsonPath('data.customer_notes', null);
    }

    public function test_timestamp_rejects_normalized_hour_24_and_invalid_clock_components(): void
    {
        $owner = $this->user();
        $pet = $this->pet($owner);
        $service = $this->service();
        $this->actingAs($owner);
        foreach (['2099-01-01T24:00:00Z', '2099-01-01T10:60:00Z', '2099-01-01T10:00:60Z'] as $timestamp) {
            $this->postJson('/api/v1/bookings', array_merge($this->payload($pet, $service), ['scheduled_at' => $timestamp]))->assertUnprocessable()->assertJsonValidationErrors('scheduled_at');
        }
    }
}
