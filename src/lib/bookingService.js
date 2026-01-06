import { db } from "./firebase";
import { collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { addMinutes, format, parse, startOfDay } from "date-fns";

const DAYS_COLLECTION = "days";

export const createOpenDay = async (date, startTime, endTime, slotDuration) => {
    // Generate slots
    const start = parse(`${date} ${startTime}`, "yyyy-MM-dd HH:mm", new Date());
    const end = parse(`${date} ${endTime}`, "yyyy-MM-dd HH:mm", new Date());

    const slots = [];
    let current = start;

    while (current < end) {
        const slotEnd = addMinutes(current, slotDuration);
        if (slotEnd > end) break;

        slots.push({
            id: crypto.randomUUID(),
            start: current.toISOString(),
            end: slotEnd.toISOString(),
            status: "open",
            booker: null,
        });

        current = slotEnd;
    }

    const dayData = {
        date,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        slotDuration,
        slots,
        createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, DAYS_COLLECTION), dayData);
    return { id: docRef.id, ...dayData };
};

export const getOpenDays = async () => {
    const q = query(collection(db, DAYS_COLLECTION), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};

export const updateSlot = async (dayId, slots) => {
    // We update the entire slots array for simplicity as we embedded it
    const dayRef = doc(db, DAYS_COLLECTION, dayId);
    await updateDoc(dayRef, { slots });
};

export const deleteDay = async (dayId) => {
    const dayRef = doc(db, DAYS_COLLECTION, dayId);
    await deleteDoc(dayRef);
};

export const bookSlot = async (dayId, slotIndex, bookerDetails) => {
    const dayRef = doc(db, DAYS_COLLECTION, dayId);
    const daySnap = await getDocs(query(collection(db, DAYS_COLLECTION))); // Re-fetching isn't efficient but doc() doesn't fetch. Need getDoc.
    // Optimization: We should fetch the specific doc.
    const dayDoc = await import("firebase/firestore").then(mod => mod.getDoc(dayRef));

    if (!dayDoc.exists()) throw new Error("Day not found");

    const dayData = dayDoc.data();
    const slots = [...dayData.slots];

    if (slots[slotIndex].status !== 'open') throw new Error("Slot is not open");

    slots[slotIndex] = {
        ...slots[slotIndex],
        status: 'unconfirmed',
        booker: bookerDetails
    };

    await updateDoc(dayRef, { slots });
    return slots;
};

export const cancelSlot = async (dayId, slotIndex, email) => {
    const dayRef = doc(db, DAYS_COLLECTION, dayId);
    const dayDoc = await import("firebase/firestore").then(mod => mod.getDoc(dayRef));

    if (!dayDoc.exists()) throw new Error("Day not found");

    const dayData = dayDoc.data();
    const slots = [...dayData.slots];
    const slot = slots[slotIndex];

    if (!slot.booker || slot.booker.email.toLowerCase() !== email.toLowerCase()) {
        throw new Error("Invalid email or no booking found");
    }

    slots[slotIndex] = {
        ...slots[slotIndex],
        status: 'open',
        booker: null
    };

    await updateDoc(dayRef, { slots });
    return slots;
};
