import { createStore } from '../src/domain/inventory.js';

const store = createStore();
const event = store.createEvent('Benchmark Event', '2026-12-01');
const tier = store.addTier(event.id, 'Standard', 1000, 50000);

console.log('Generating 20,000 bookings for benchmark comparison...');
const bookingsArray = [];
let targetRef = '';

for (let i = 0; i < 20000; i++) {
  const booking = store.bookTickets(event.id, tier.id, 1, `User ${i}`);
  bookingsArray.push(booking);
  if (i === 15000) {
    targetRef = booking.reference;
  }
}

const iterations = 100000;

// Benchmark Array.find O(N)
console.time('Array.find (O(N)) time');
for (let i = 0; i < iterations; i++) {
  bookingsArray.find(b => b.reference === targetRef);
}
console.timeEnd('Array.find (O(N)) time');

// Benchmark Map.get O(1)
console.time('Map.get (O(1)) time');
for (let i = 0; i < iterations; i++) {
  store.findBookingByReference(targetRef);
}
console.timeEnd('Map.get (O(1)) time');

console.log('\nBenchmark finished.');