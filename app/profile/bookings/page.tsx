"use client";

import { Suspense } from "react";
import Header from "@/components/header";
import UserBookings from "@/components/user-bookings";
import Navigation from "@/components/navigation";
import { Loader2 } from "lucide-react";

function BookingsContent() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header title="My Bookings" />
      <UserBookings />
      <Navigation />
    </div>
  );
}

function BookingsFallback() {
  return (
    <div className="flex justify-center items-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<BookingsFallback />}>
      <BookingsContent />
    </Suspense>
  );
}