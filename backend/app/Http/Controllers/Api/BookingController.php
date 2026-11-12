<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BookingListRequest;
use App\Http\Requests\BookingStaffNotesRequest;
use App\Http\Requests\BookingStatusRequest;
use App\Http\Requests\StoreBookingRequest;
use App\Http\Requests\UpdateBookingRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\BookingQueryService;
use App\Services\BookingService;
use Illuminate\Http\Request;

class BookingController extends Controller
{
    public function index(BookingListRequest $request, BookingQueryService $query)
    {
        return BookingResource::collection($query->listing($request->user(), $request->validated(), $request->perPage(), $request->routeIs('bookings.own')));
    }

    public function store(StoreBookingRequest $request, BookingService $bookings)
    {
        return (new BookingResource($bookings->create($request->user(), $request->validated())))->response()->setStatusCode(201);
    }

    public function show(Request $request, Booking $booking, BookingQueryService $query): BookingResource
    {
        return new BookingResource($query->show($request->user(), $booking));
    }

    public function update(UpdateBookingRequest $request, Booking $booking, BookingService $bookings): BookingResource
    {
        return new BookingResource($bookings->update($request->user(), $booking, $request->validated()));
    }

    public function status(BookingStatusRequest $request, Booking $booking, BookingService $bookings): BookingResource
    {
        return new BookingResource($bookings->transition($request->user(), $booking, $request->validated()));
    }

    public function staffNotes(BookingStaffNotesRequest $request, Booking $booking, BookingService $bookings): BookingResource
    {
        return new BookingResource($bookings->staffNotes($request->user(), $booking, $request->validated()));
    }
}
