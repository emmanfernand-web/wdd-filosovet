<?php

namespace App\Http\Requests;

use App\Enums\BookingStatus;
use App\Models\Booking;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class BookingListRequest extends PaginationRequest
{
    public function authorize(): bool
    {
        return Gate::allows($this->routeIs('bookings.own') ? 'viewOwn' : 'viewAny', Booking::class);
    }

    public function rules(): array
    {
        return parent::rules() + ['status' => ['sometimes', Rule::enum(BookingStatus::class)],
            'service_category_id' => ['sometimes', 'integer', 'exists:service_categories,id'],
            'service_id' => ['sometimes', 'integer', 'exists:services,id'], 'pet_id' => ['sometimes', 'integer'],
            'from' => ['sometimes', 'date_format:Y-m-d'], 'to' => ['sometimes', 'date_format:Y-m-d', 'after_or_equal:from']];
    }
}
