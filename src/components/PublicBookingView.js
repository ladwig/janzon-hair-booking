"use client";
import { useState, useEffect } from "react";
import { getOpenDays, bookSlot, cancelSlot, addToWaitlist } from "@/lib/bookingService";
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
import { de } from "date-fns/locale";

export default function PublicBookingView() {
    const [days, setDays] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedSlot, setExpandedSlot] = useState(null); // For waitlist expansion

    // Dialog State
    const [selectedDay, setSelectedDay] = useState(null);
    const [selectedSlotIndex, setSelectedSlotIndex] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogType, setDialogType] = useState("book"); // 'book', 'cancel', or 'waitlist'

    // Form State
    const [formData, setFormData] = useState({ firstName: "", lastName: "", email: "" });
    const [cancelEmail, setCancelEmail] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        loadDays();
    }, []);

    async function loadDays() {
        const data = await getOpenDays();
        // Filter out past dates - only show today and future dates
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to start of day

        const futureDays = data.filter(day => {
            const dayDate = new Date(day.date);
            return dayDate >= today;
        });

        setDays(futureDays);
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

    const onWaitlistSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setActionLoading(true);

        try {
            await addToWaitlist(selectedDay.id, selectedSlotIndex, formData);
            setDialogOpen(false);
            setFormData({ firstName: "", lastName: "", email: "" });
            // Refresh days to show updated waitlist
            const updatedDays = await getOpenDays();
            setDays(updatedDays);
        } catch (err) {
            console.error(err);
            setError(err.message || "Fehler beim Hinzufügen zur Warteliste.");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center p-8">Lade Verfügbarkeit...</div>;
    }

    return (
        <div className="w-full max-w-5xl mx-auto space-y-6 mt-8 pb-20 px-4">
            {/* Logo */}
            <div className="flex justify-center mb-6">
                <img
                    src="/logo.png"
                    alt="Janzon Hair Logo"
                    className="h-60 w-auto object-contain"
                />
            </div>

            <h2 className="text-3xl font-bold text-center mb-8">Verfügbare Termine</h2>

            {days.length === 0 && <p className="text-center text-gray-500">Momentan keine Termine verfügbar.</p>}

            {/* List View */}
            <div className="space-y-6">
                {days.map((day) => (
                    <div key={day.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                        {/* Day Header */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-6 py-4">
                            <h3 className="text-xl font-semibold text-gray-900">
                                {format(parse(day.date + ' ' + day.startTime.split('T')[1].substring(0, 5), "yyyy-MM-dd HH:mm", new Date()), "EEEE, d. MMMM", { locale: de })}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">
                                {format(new Date(day.startTime), "HH:mm")} - {format(new Date(day.endTime), "HH:mm")}
                            </p>
                        </div>

                        {/* Slots List */}
                        <div className="divide-y divide-gray-200">
                            {day.slots.map((slot, index) => {
                                const slotKey = `${day.id}-${index}`;
                                const isExpanded = expandedSlot === slotKey;
                                const hasWaitlist = slot.waitlist && slot.waitlist.length > 0;

                                return (
                                    <div key={index} className="hover:bg-gray-50 transition-colors">
                                        {/* Main Slot Row */}
                                        <div className="px-6 py-4 flex items-center justify-between gap-4">
                                            {/* Time */}
                                            <div className="flex-shrink-0 w-20">
                                                <div className="text-lg font-semibold text-gray-900">
                                                    {format(new Date(slot.start), "HH:mm")}
                                                </div>
                                            </div>

                                            {/* Status & Booker Info */}
                                            <div className="flex-1 min-w-0">
                                                {slot.status === 'open' ? (
                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
                                                        Verfügbar
                                                    </span>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${slot.status === 'confirmed'
                                                            ? 'bg-red-100 text-red-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                            }`}>
                                                            Gebucht
                                                        </span>
                                                        {slot.booker && (
                                                            <span className="text-sm text-gray-600">
                                                                {slot.booker.firstName} {slot.booker.lastName?.[0]}.
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center gap-2">
                                                {/* Waitlist Info/Button */}
                                                {hasWaitlist && (
                                                    <button
                                                        onClick={() => setExpandedSlot(isExpanded ? null : slotKey)}
                                                        className="px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 rounded hover:bg-amber-100 transition-all"
                                                    >
                                                        {slot.waitlist.length} auf Warteliste {isExpanded ? '▲' : '▼'}
                                                    </button>
                                                )}

                                                {/* Main Action Button */}
                                                {slot.status === 'open' ? (
                                                    <Button
                                                        onClick={() => handleSlotClick(day, index)}
                                                        className="bg-emerald-600 hover:bg-emerald-700"
                                                    >
                                                        Buchen
                                                    </Button>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => {
                                                                setSelectedDay(day);
                                                                setSelectedSlotIndex(index);
                                                                setDialogType('waitlist');
                                                                setDialogOpen(true);
                                                                setError("");
                                                            }}
                                                            className="border-amber-300 text-amber-700 hover:bg-amber-50"
                                                        >
                                                            Auf Warteliste
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleSlotClick(day, index)}
                                                            className="border-red-300 text-red-700 hover:bg-red-50"
                                                        >
                                                            Stornieren
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Expanded Waitlist */}
                                        {isExpanded && hasWaitlist && (
                                            <div className="px-6 pb-4 bg-amber-50/30 border-t border-amber-100">
                                                <div className="pt-3 space-y-2">
                                                    <div className="text-xs font-semibold text-gray-600 mb-2">
                                                        Personen auf der Warteliste:
                                                    </div>
                                                    {slot.waitlist.map((entry, idx) => (
                                                        <div key={idx} className="flex items-center justify-between bg-white border border-amber-200 rounded px-3 py-2">
                                                            <div className="text-sm text-gray-700">
                                                                {idx + 1}. {entry.firstName} {entry.lastName}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[425px] w-[95vw] rounded-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {dialogType === 'book' ? 'Termin buchen' : dialogType === 'waitlist' ? 'Auf Warteliste setzen' : 'Buchung verwalten'}
                        </DialogTitle>
                        <DialogDescription>
                            {dialogType === 'book'
                                ? `Gib deine Daten ein, um den Slot um ${selectedDay && selectedSlotIndex !== null ? format(new Date(selectedDay.slots[selectedSlotIndex].start), "HH:mm") : ''} zu buchen.`
                                : dialogType === 'waitlist'
                                    ? `Gib deine Daten ein, um dich für den Slot um ${selectedDay && selectedSlotIndex !== null ? format(new Date(selectedDay.slots[selectedSlotIndex].start), "HH:mm") : ''} auf die Warteliste zu setzen.`
                                    : `Gib deine E-Mail ein, um deine Buchung um ${selectedDay && selectedSlotIndex !== null ? format(new Date(selectedDay.slots[selectedSlotIndex].start), "HH:mm") : ''} zu stornieren.`}
                        </DialogDescription>
                    </DialogHeader>

                    {dialogType === 'book' || dialogType === 'waitlist' ? (
                        <form onSubmit={dialogType === 'book' ? onBookSubmit : onWaitlistSubmit} className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="firstName">Vorname</Label>
                                <Input id="firstName" value={formData.firstName || ''} onChange={e => setFormData({ ...formData, firstName: e.target.value })} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="lastName">Nachname</Label>
                                <Input id="lastName" value={formData.lastName || ''} onChange={e => setFormData({ ...formData, lastName: e.target.value })} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
                            </div>
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <Button type="submit" className="w-full" disabled={actionLoading}>
                                {actionLoading ? (dialogType === 'book' ? "Buche..." : "Füge hinzu...") : (dialogType === 'book' ? "Buchung bestätigen" : "Zur Warteliste hinzufügen")}
                            </Button>
                        </form>
                    ) : (
                        <form onSubmit={onCancelSubmit} className="space-y-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="cancelEmail">E-Mail-Verifizierung</Label>
                                <Input
                                    id="cancelEmail"
                                    type="email"
                                    placeholder="Gib die E-Mail ein, die für die Buchung verwendet wurde"
                                    value={cancelEmail || ''}
                                    onChange={e => setCancelEmail(e.target.value)}
                                    required
                                />
                            </div>
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                            <Button type="submit" variant="destructive" className="w-full" disabled={actionLoading}>
                                {actionLoading ? "Verarbeite..." : "Buchung stornieren"}
                            </Button>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
