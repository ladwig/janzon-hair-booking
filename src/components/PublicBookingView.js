"use client";
import { useState, useEffect } from "react";
import { getOpenDays, bookSlot, cancelSlot } from "@/lib/bookingService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { format, parse } from "date-fns";

export default function PublicBookingView() {
    const [days, setDays] = useState([]);
    const [loading, setLoading] = useState(true);

    // Dialog State
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState("book"); // 'book' or 'cancel'

    // Form State
    const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "" });
    const [cancelEmail, setCancelEmail] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchDays();
    }, []);

    async function fetchDays() {
        const data = await getOpenDays();
        setDays(data);
        setLoading(false);
    }

    const handleSlotClick = (day, index) => {
        const slot = day.slots[index];
        if (slot.status === 'open') {
            setDialogType('book');
        } else {
            setDialogType('cancel');
        }

        setSelectedDay(day);
        setSelectedSlotIndex(index);
        setFormData({ firstName: "", lastName: "", email: "" });
        setCancelEmail("");
        setError("");
        setDialogOpen(true);
    };

    const onBookSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError("");
        try {
            await bookSlot(selectedDay.id, selectedSlotIndex, formData);
            await fetchDays(); // Refresh data
            setDialogOpen(false);
        } catch (err) {
            setError(err.message || "Failed to book slot");
        } finally {
            setActionLoading(false);
        }
    };

    const onCancelSubmit = async (e) => {
        e.preventDefault();
        setActionLoading(true);
        setError("");
        try {
            // Client-side validation could mimic server check for better UX, but server is authority
            await cancelSlot(selectedDay.id, selectedSlotIndex, cancelEmail);
            await fetchDays();
            setDialogOpen(false);
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to cancel booking. Check your email.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center p-8">Loading availability...</div>;
    }

    return (
        <div className="w-full max-w-4xl mx-auto space-y-8 mt-8 pb-20">
            <h2 className="text-3xl font-bold text-center mb-8">Available Appointments</h2>

            {days.length === 0 && <p className="text-center text-gray-500">No appointments available at the moment.</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 sm:px-0">
                {days.map((day) => (
                    <Card key={day.id} className="overflow-hidden shadow-sm border-gray-200">
                        <CardHeader className="bg-gray-50 border-b pb-4">
                            <CardTitle className="text-lg">
                                {format(parse(day.date + ' ' + day.startTime.split('T')[1].substring(0, 5), "yyyy-MM-dd HH:mm", new Date()), "EEEE, MMMM do")}
                            </CardTitle>
                            <div className="text-sm text-gray-500">
                                {format(new Date(day.startTime), "HH:mm")} - {format(new Date(day.endTime), "HH:mm")}
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-3 gap-3">
                                {day.slots.map((slot, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleSlotClick(day, index)}
                                        className={`
                                text-center p-3 rounded-md text-sm font-medium border transition-all flex flex-col items-center justify-center min-h-[60px]
                                ${slot.status === 'open'
                                                ? 'bg-white text-green-700 border-green-200 hover:bg-green-50 hover:border-green-300 shadow-sm'
                                                : slot.status === 'confirmed'
                                                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-pointer'
                                                    : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100 cursor-pointer'}
                            `}
                                    >
                                        <span className="font-semibold">{format(new Date(slot.start), "HH:mm")}</span>
                                        {slot.booker && (
                                            <span className="text-xs mt-1 truncate w-full">
                                                {slot.booker.firstName} {slot.booker.lastName?.[0]}.
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {dialogType === 'book' ? 'Book Appointment' : 'Manage Booking'}
                        </DialogTitle>
                        <DialogDescription>
                            {dialogType === 'book'
                                ? `Enter your details to book the slot at ${selectedDay && selectedSlotIndex !== null ? format(new Date(selectedDay.slots[selectedSlotIndex].start), "HH:mm") : ''}.`
                                : `Enter your email to cancel your booking at ${selectedDay && selectedSlotIndex !== null ? format(new Date(selectedDay.slots[selectedSlotIndex].start), "HH:mm") : ''}.`}
                        </DialogDescription>
                    </DialogHeader>

                    {dialogType === 'book' ? (
                        <form onSubmit={onBookSubmit} className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input id="firstName" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input id="lastName" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                            </div>
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <Button type="submit" className="w-full" disabled={actionLoading}>
                                {actionLoading ? "Booking..." : "Confirm Booking"}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={onCancelSubmit} className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="cancelEmail">Email verification</Label>
                                <Input
                                    id="cancelEmail"
                                    type="email"
                                    placeholder="Enter the email used for booking"
                                    value={cancelEmail}
                                    onChange={e => setCancelEmail(e.target.value)}
                                    required
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <Button type="submit" variant="destructive" className="w-full" disabled={actionLoading}>
                                {actionLoading ? "Processing..." : "Cancel Booking"}
                            </Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
