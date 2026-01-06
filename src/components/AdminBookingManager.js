"use client";
import { useState, useEffect } from "react";
import { createOpenDay, getOpenDays, deleteDay, updateSlot } from "@/lib/bookingService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format, parse } from "date-fns";
import { Trash2, Calendar, Clock, Users, CheckCircle2, Plus } from "lucide-react";

export default function AdminBookingManager() {
    const [days, setDays] = useState([]);
    const today = new Date().toISOString().split('T')[0];
    const [newDayDate, setNewDayDate] = useState(today);
    const [startHour, setStartHour] = useState(9);
    const [endHour, setEndHour] = useState(17);
    const [duration, setDuration] = useState(60);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadDays();
    }, []);

    const loadDays = async () => {
        const data = await getOpenDays();
        setDays(data);
    };

    const handleCreateDay = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const startTime = `${String(startHour).padStart(2, '0')}:00`;
            const endTime = `${String(endHour).padStart(2, '0')}:00`;
            await createOpenDay(newDayDate, startTime, endTime, parseInt(duration));
            await loadDays();
            setNewDayDate(today);
        } catch (error) {
            console.error("Error creating day:", error);
            alert("Failed to create day");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDay = async (id) => {
        if (!confirm("Are you sure? This will delete all slots for this day.")) return;
        await deleteDay(id);
        await loadDays();
    };

    const handleSlotStatusChange = async (day, slotIndex, newStatus) => {
        const updatedSlots = [...day.slots];
        updatedSlots[slotIndex].status = newStatus;
        if (newStatus === 'open') {
            updatedSlots[slotIndex].booker = null;
        }

        const updatedDays = days.map(d => d.id === day.id ? { ...d, slots: updatedSlots } : d);
        setDays(updatedDays);

        await updateSlot(day.id, updatedSlots);
    };

    const handleBookerEdit = async (day, slotIndex, field, value) => {
        const updatedSlots = [...day.slots];
        if (!updatedSlots[slotIndex].booker) {
            updatedSlots[slotIndex].booker = { firstName: '', lastName: '', email: '' };
        }
        updatedSlots[slotIndex].booker[field] = value;

        const updatedDays = days.map(d => d.id === day.id ? { ...d, slots: updatedSlots } : d);
        setDays(updatedDays);

        await updateSlot(day.id, updatedSlots);
    };

    const handleBookerCreate = async (day, slotIndex, field, value) => {
        const updatedSlots = [...day.slots];
        if (!updatedSlots[slotIndex].booker) {
            updatedSlots[slotIndex].booker = { firstName: '', lastName: '', email: '' };
            updatedSlots[slotIndex].status = 'unconfirmed';
        }
        updatedSlots[slotIndex].booker[field] = value;

        const updatedDays = days.map(d => d.id === day.id ? { ...d, slots: updatedSlots } : d);
        setDays(updatedDays);

        await updateSlot(day.id, updatedSlots);
    };

    const handleDeleteSlot = async (day, slotIndex) => {
        if (!confirm("Delete this slot?")) return;
        const updatedSlots = [...day.slots];
        updatedSlots.splice(slotIndex, 1);

        const updatedDays = days.map(d => d.id === day.id ? { ...d, slots: updatedSlots } : d);
        setDays(updatedDays);

        await updateSlot(day.id, updatedSlots);
    };

    const handleAddSlot = async (day, startTime, endTime) => {
        const updatedSlots = [...day.slots];
        updatedSlots.push({
            id: crypto.randomUUID(),
            start: startTime,
            end: endTime,
            status: "open",
            booker: null,
        });

        updatedSlots.sort((a, b) => new Date(a.start) - new Date(b.start));

        const updatedDays = days.map(d => d.id === day.id ? { ...d, slots: updatedSlots } : d);
        setDays(updatedDays);

        await updateSlot(day.id, updatedSlots);
    };

    const handleConfirmAllSlots = async (day) => {
        if (!confirm("Confirm all booked slots for this day?")) return;
        const updatedSlots = day.slots.map(slot =>
            slot.booker ? { ...slot, status: 'confirmed' } : slot
        );

        const updatedDays = days.map(d => d.id === day.id ? { ...d, slots: updatedSlots } : d);
        setDays(updatedDays);

        await updateSlot(day.id, updatedSlots);
    };

    const getSlotStats = (day) => {
        const total = day.slots.length;
        const booked = day.slots.filter(s => s.booker).length;
        const confirmed = day.slots.filter(s => s.status === 'confirmed').length;
        const available = total - booked;
        return { total, booked, confirmed, available };
    };

    return (
        <div className="space-y-6">
            {/* Create Day Card */}
            <Card className="border shadow-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <CardTitle className="text-base">Create New Open Day</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleCreateDay} className="flex flex-wrap gap-3 items-end">
                        <div className="space-y-1 flex-1 min-w-[140px]">
                            <Label className="text-xs font-medium">Date</Label>
                            <Input type="date" value={newDayDate} onChange={e => setNewDayDate(e.target.value)} required className="h-9" />
                        </div>
                        <div className="space-y-1 w-28">
                            <Label className="text-xs font-medium">Start (h)</Label>
                            <Input
                                type="number"
                                value={startHour}
                                onChange={e => setStartHour(parseInt(e.target.value))}
                                required
                                className="h-9"
                                min="0"
                                max="23"
                                step="1"
                            />
                        </div>
                        <div className="space-y-1 w-28">
                            <Label className="text-xs font-medium">End (h)</Label>
                            <Input
                                type="number"
                                value={endHour}
                                onChange={e => setEndHour(parseInt(e.target.value))}
                                required
                                className="h-9"
                                min="0"
                                max="23"
                                step="1"
                            />
                        </div>
                        <div className="space-y-1 w-24">
                            <Label className="text-xs font-medium">Duration</Label>
                            <Input type="number" value={duration} onChange={e => setDuration(e.target.value)} required className="h-9" min="15" step="15" />
                        </div>
                        <Button type="submit" disabled={loading} className="h-9 bg-blue-600 hover:bg-blue-700">
                            {loading ? "Creating..." : <><Plus className="w-4 h-4 mr-1" /> Add Day</>}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Scheduled Days */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">Scheduled Days</h3>
                    <span className="text-sm text-gray-500">{days.length} day{days.length !== 1 ? 's' : ''}</span>
                </div>

                {days.length === 0 && (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Calendar className="w-12 h-12 mb-3 opacity-50" />
                            <p>No days scheduled yet</p>
                        </CardContent>
                    </Card>
                )}

                {days.map((day) => {
                    const stats = getSlotStats(day);
                    return (
                        <Card key={day.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow">
                            {/* Day Header */}
                            <div className="bg-gradient-to-r from-gray-50 to-slate-50 border-b">
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-lg text-gray-800 mb-2">
                                                {format(parse(day.date + ' ' + day.startTime.split('T')[1].substring(0, 5), "yyyy-MM-dd HH:mm", new Date()), "EEEE, MMMM do yyyy")}
                                            </h4>
                                            <div className="flex flex-wrap gap-4 text-sm">
                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{format(new Date(day.startTime), "HH:mm")} - {format(new Date(day.endTime), "HH:mm")}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-gray-600">
                                                    <Users className="w-4 h-4" />
                                                    <span>{stats.booked}/{stats.total} booked</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-green-600">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    <span>{stats.confirmed} confirmed</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleConfirmAllSlots(day)}
                                                className="hidden sm:flex"
                                            >
                                                Confirm All
                                            </Button>
                                            <Button variant="destructive" size="sm" onClick={() => handleDeleteDay(day.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Slots List */}
                            <div className="divide-y divide-gray-200">
                                {day.slots.map((slot, idx) => (
                                    <SlotRow
                                        key={slot.id}
                                        slot={slot}
                                        day={day}
                                        index={idx}
                                        onStatusChange={handleSlotStatusChange}
                                        onBookerEdit={handleBookerEdit}
                                        onBookerCreate={handleBookerCreate}
                                        onDelete={handleDeleteSlot}
                                    />
                                ))}
                                <AddSlotForm day={day} onAddSlot={handleAddSlot} />
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

function SlotRow({ slot, day, index, onStatusChange, onBookerEdit, onBookerCreate, onDelete }) {
    const statusColors = {
        open: 'bg-gray-50 border-l-gray-400',
        unconfirmed: 'bg-amber-50 border-l-amber-500',
        confirmed: 'bg-emerald-50 border-l-emerald-500'
    };

    const statusBadgeColors = {
        open: 'bg-gray-100 text-gray-700 border-gray-200',
        unconfirmed: 'bg-amber-100 text-amber-700 border-amber-200',
        confirmed: 'bg-emerald-100 text-emerald-700 border-emerald-200'
    };

    return (
        <div className={`p-4 border-l-4 ${statusColors[slot.status]} hover:bg-opacity-80 transition-colors`}>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Time and Status */}
                <div className="flex items-center gap-4 md:w-64">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold text-sm">
                            {format(new Date(slot.start), "HH:mm")} - {format(new Date(slot.end), "HH:mm")}
                        </span>
                    </div>
                    <select
                        className={`text-xs px-2 py-1 rounded-md border font-medium ${statusBadgeColors[slot.status]}`}
                        value={slot.status}
                        onChange={(e) => onStatusChange(day, index, e.target.value)}
                    >
                        <option value="open">Open</option>
                        <option value="unconfirmed">Unconfirmed</option>
                        <option value="confirmed">Confirmed</option>
                    </select>
                </div>

                {/* Booker Info */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    {slot.booker ? (
                        <>
                            <Input
                                className="h-9 text-sm"
                                placeholder="First Name"
                                value={slot.booker?.firstName || ''}
                                onChange={(e) => onBookerEdit(day, index, 'firstName', e.target.value)}
                            />
                            <Input
                                className="h-9 text-sm"
                                placeholder="Last Name"
                                value={slot.booker?.lastName || ''}
                                onChange={(e) => onBookerEdit(day, index, 'lastName', e.target.value)}
                            />
                            <Input
                                className="h-9 text-sm"
                                placeholder="Email"
                                type="email"
                                value={slot.booker?.email || ''}
                                onChange={(e) => onBookerEdit(day, index, 'email', e.target.value)}
                            />
                        </>
                    ) : (
                        <>
                            <Input
                                className="h-9 text-sm"
                                placeholder="First Name"
                                defaultValue=""
                                onBlur={(e) => {
                                    if (e.target.value) onBookerCreate(day, index, 'firstName', e.target.value);
                                }}
                            />
                            <Input
                                className="h-9 text-sm"
                                placeholder="Last Name"
                                defaultValue=""
                                onBlur={(e) => {
                                    if (e.target.value) onBookerCreate(day, index, 'lastName', e.target.value);
                                }}
                            />
                            <Input
                                className="h-9 text-sm"
                                placeholder="Email"
                                type="email"
                                defaultValue=""
                                onBlur={(e) => {
                                    if (e.target.value) onBookerCreate(day, index, 'email', e.target.value);
                                }}
                            />
                        </>
                    )}
                </div>

                {/* Delete Button */}
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0 hover:bg-red-100 hover:text-red-600 self-start md:self-center"
                    onClick={() => onDelete(day, index)}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}

function AddSlotForm({ day, onAddSlot }) {
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [isAdding, setIsAdding] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!startTime || !endTime) return;

        const dayDate = day.date;
        const startISO = new Date(`${dayDate}T${startTime}`).toISOString();
        const endISO = new Date(`${dayDate}T${endTime}`).toISOString();

        await onAddSlot(day, startISO, endISO);
        setStartTime("");
        setEndTime("");
        setIsAdding(false);
    };

    if (!isAdding) {
        return (
            <div className="p-4 border-t-2 border-dashed border-gray-300 bg-gray-50 hover:bg-blue-50 transition-colors">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdding(true)}
                    className="w-full text-gray-500 hover:text-blue-600"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Slot
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 bg-blue-50 border-t-2 border-blue-300">
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-end gap-3">
                <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                        <Label className="text-xs font-medium">Start Time</Label>
                        <Input
                            type="time"
                            className="h-9 text-sm"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            required
                        />
                    </div>
                    <div>
                        <Label className="text-xs font-medium">End Time</Label>
                        <Input
                            type="time"
                            className="h-9 text-sm"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button type="submit" size="sm" className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700">
                        Add Slot
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setIsAdding(false)}
                        className="flex-1 md:flex-none"
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
}
