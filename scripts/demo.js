import { createStore } from '../src/domain/inventory.js';

const store = createStore();

console.log('--- EVENT TICKETING DEMO ---\n');

// 1. Create an event and tier with capacity of 3 seats
const event = store.createEvent('JavaScript Full-Stack Meetup', '2026-11-20');
const tier = store.addTier(event.id, 'General Admission', 5000, 3); // $50.00 in cents
console.log(`Created event: "${event.name}" with tier "${tier.name}" (Capacity: ${tier.capacity})`);

// 2. Ada books 2 tickets
const adaBooking = store.bookTickets(event.id, tier.id, 2, 'Ada');
console.log(`Ada booked 2 tickets. Reference: ${adaBooking.reference}`);

// 3. Bayo is refused when asking for 2 tickets when only 1 is left
try {
  store.bookTickets(event.id, tier.id, 2, 'Bayo');
} catch (err) {
  console.log(`Bayo booking refused: [${err.code}] ${err.message}`);
}

// 4. Bayo books the remaining 1 ticket, selling out the event
const bayoBooking = store.bookTickets(event.id, tier.id, 1, 'Bayo');
console.log(`Bayo successfully booked 1 ticket. Reference: ${bayoBooking.reference}`);
console.log(`Tier Status: ${tier.soldCount}/${tier.capacity} seats sold (SOLD OUT)`);

// 5. Two people join the waitlist (Chidi and Efe)
store.joinWaitlist(event.id, 'Chidi');
console.log('Chidi joined the waitlist.');
store.joinWaitlist(event.id, 'Efe');
console.log('Efe joined the waitlist.');

// 6. Find a booking by its reference code in O(1)
const found = store.findBookingByReference(adaBooking.reference);
console.log(`Lookup successful! Reference ${found.reference} belongs to ${found.attendeeName} (${found.quantity} tickets).`);

// 7. Ada cancels her booking
console.log('Ada cancels her booking...');
store.cancelBooking(adaBooking.reference);
console.log(`Tier Status after cancellation: ${tier.soldCount}/${tier.capacity} seats sold.`);

// 8. Name the next person in line on the waitlist
const nextPerson = store.dequeueWaitlist(event.id);
console.log(`Next person off the waitlist: ${nextPerson.attendeeName}`);

console.log('\n--- DEMO COMPLETED SUCCESSFULLY ---');