// test/build2.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/domain/inventory.js';
import { filterEvents, sortEvents } from '../src/domain/eventSearch.js';
import { mergeSort } from '../src/domain/sorting.js';
import { DomainError } from '../src/domain/errors.js';

describe('Build 2 Domain, Search, and Sorting Tests', () => {
  
  // S02 Tests
  describe('S02: Event Creation', () => {
    it('should save an event as a draft with a new id and not on public list', () => {
      const store = createStore();
      const event = store.createEvent({
        title: 'Lagos Tech Meetup',
        city: 'Lagos',
        venue: 'Eko Hotel',
        date: '2026-12-05T17:00:00.000Z'
      });

      assert.equal(event.status, 'draft');
      assert.ok(event.id);
      
      const publicSummaries = store.listEventSummaries({ publishedOnly: true });
      assert.equal(publicSummaries.length, 0);
    });

    it('should reject missing title, city, or bad date with VALIDATION', () => {
      const store = createStore();
      assert.throws(() => {
        store.createEvent({ city: 'Lagos', venue: 'Venue', date: '2026-12-05' });
      }, (err) => err instanceof DomainError && err.code === 'VALIDATION');

      assert.throws(() => {
        store.createEvent({ title: 'Event', city: 'Lagos', venue: 'Venue', date: 'not-a-date' });
      }, (err) => err instanceof DomainError && err.code === 'VALIDATION');
    });
  });

  // S03 Tests
  describe('S03: Ticket Tiers', () => {
    it('should add a tier with correct initial sold count and capacity', () => {
      const store = createStore();
      const event = store.createEvent({
        title: 'Event',
        city: 'Lagos',
        venue: 'Venue',
        date: '2026-12-05T17:00:00.000Z'
      });
      const tier = store.addTier(event.id, 'General', 500000, 100);

      assert.equal(tier.soldCount, 0);
      assert.equal(tier.capacity, 100);
    });

    it('should reject fractional/invalid price or capacity less than 1 with VALIDATION', () => {
      const store = createStore();
      const event = store.createEvent({
        title: 'Event',
        city: 'Lagos',
        venue: 'Venue',
        date: '2026-12-05T17:00:00.000Z'
      });

      assert.throws(() => {
        store.addTier(event.id, 'General', 50.5, 100);
      }, (err) => err instanceof DomainError && err.code === 'VALIDATION');

      assert.throws(() => {
        store.addTier(event.id, 'General', 50000, 0);
      }, (err) => err instanceof DomainError && err.code === 'VALIDATION');
    });

    it('should reject adding a tier to a non-existent event with NOT_FOUND', () => {
      const store = createStore();
      assert.throws(() => {
        store.addTier('non-existent-id', 'General', 50000, 100);
      }, (err) => err instanceof DomainError && err.code === 'NOT_FOUND');
    });
  });

  // S04 Tests (Publishing, unpublishing, and ticket refunds)
  describe('S04: Publishing and Unpublishing', () => {
    it('should throw INVALID_STATE when publishing an event with no tiers', () => {
      const store = createStore();
      const event = store.createEvent({
        title: 'Empty Event',
        city: 'Lagos',
        venue: 'Venue',
        date: '2026-12-05T17:00:00.000Z'
      });

      assert.throws(() => {
        store.publishEvent(event.id);
      }, (err) => err instanceof DomainError && err.code === 'INVALID_STATE');
    });

    it('should publish, unpublish, and refund tickets correctly', () => {
      const store = createStore();
      const event = store.createEvent({
        title: 'Jazz Night',
        city: 'Abuja',
        venue: 'Arena',
        date: '2026-12-05T17:00:00.000Z'
      });
      const tier = store.addTier(event.id, 'VIP', 100000, 10);
      
      store.publishEvent(event.id);
      assert.equal(store.listEventSummaries({ publishedOnly: true }).length, 1);

      // Book tickets
      const booking = store.bookTickets(event.id, tier.id, 2, 'Ada');
      assert.equal(booking.status, 'CONFIRMED');

      // Unpublish event: returns to draft, hides from public, and refunds tickets
      store.unpublishEvent(event.id);
      assert.equal(store.listEventSummaries({ publishedOnly: true }).length, 0);
      
      const updatedBooking = store.findBookingByReference(booking.reference);
      assert.equal(updatedBooking.status, 'REFUNDED');
    });
  });

  // S05 Tests (Search, Filter, Sort)
  describe('S05: Search, Filter, and Sort', () => {
    const summaries = [
      { id: '1', title: 'Lagos Tech Meetup', city: 'Lagos', venue: 'Hub', date: '2026-12-01T10:00:00.000Z', cheapestPriceCents: 1000, totalSeatsLeft: 50 },
      { id: '2', title: 'Abuja Jazz Night', city: 'Abuja', venue: 'Lounge', date: '2026-12-05T17:00:00.000Z', cheapestPriceCents: 5000, totalSeatsLeft: 5 },
      { id: '3', title: 'Lagos Music Fest', city: 'Lagos', venue: 'Beach', date: '2026-12-05T17:00:00.000Z', cheapestPriceCents: 2000, totalSeatsLeft: 0 } // Timestamp matched to item 2 for tie-breaking
    ];

    it('should search by title/venue ignoring case', () => {
      const results = filterEvents(summaries, { q: 'JAZZ' });
      assert.equal(results.length, 1);
      assert.equal(results[0].title, 'Abuja Jazz Night');
    });

    it('should filter by city case-insensitively', () => {
      const results = filterEvents(summaries, { city: 'lagos' });
      assert.equal(results.length, 2);
    });

    it('should filter by max price and leave out events with no tiers', () => {
      const mixed = [...summaries, { id: '4', title: 'Free Event', city: 'Lagos', venue: 'Park', date: '2026-12-02T10:00:00.000Z', cheapestPriceCents: null, totalSeatsLeft: 10 }];
      const results = filterEvents(mixed, { maxPriceCents: 2000 });
      assert.equal(results.length, 2);
    });

    it('should include events up to the specified date inclusively', () => {
      const results = filterEvents(summaries, { to: '2026-12-05' });
      assert.equal(results.length, 3);
    });

    it('should sort by date with tie-breaking by title then id', () => {
      const sorted = sortEvents(summaries, 'date');
      assert.equal(sorted[0].id, '1');
      assert.equal(sorted[1].id, '2'); // Abuja Jazz Night comes before Lagos Music Fest alphabetically on the same day
      assert.equal(sorted[2].id, '3');
    });

    it('should ensure original list is unchanged after sorting and filtering', () => {
      const original = [...summaries];
      const filtered = filterEvents(summaries, { city: 'Lagos' });
      const sorted = sortEvents(summaries, 'price');
      
      assert.deepEqual(summaries, original);
      assert.notStrictEqual(filtered, summaries);
      assert.notStrictEqual(sorted, summaries);
    });

    it('should reject unknown sort options or bad dates with VALIDATION', () => {
      assert.throws(() => {
        sortEvents(summaries, 'unknown-sort');
      }, (err) => err instanceof DomainError && err.code === 'VALIDATION');

      assert.throws(() => {
        filterEvents(summaries, { from: 'bad-date' });
      }, (err) => err instanceof DomainError && err.code === 'VALIDATION');
    });
  });

  // S06 Tests (Booking tickets)
  describe('S06: Ticket Booking', () => {
    it('should book tickets successfully when seats are available', () => {
      const store = createStore();
      const event = store.createEvent({
        title: 'Concert',
        city: 'Lagos',
        venue: 'Arena',
        date: '2026-12-10T19:00:00.000Z'
      });
      const tier = store.addTier(event.id, 'General', 20000, 3);
      store.publishEvent(event.id);

      const booking = store.bookTickets(event.id, tier.id, 2, 'Ada');
      assert.equal(booking.quantity, 2);
      assert.equal(booking.status, 'CONFIRMED');

      const summaries = store.listEventSummaries();
      assert.equal(summaries[0].totalSeatsLeft, 1);
    });

    it('should reject booking with SOLD_OUT when not enough seats are left', () => {
      const store = createStore();
      const event = store.createEvent({
        title: 'Concert',
        city: 'Lagos',
        venue: 'Arena',
        date: '2026-12-10T19:00:00.000Z'
      });
      const tier = store.addTier(event.id, 'General', 20000, 1);
      store.publishEvent(event.id);

      assert.throws(() => {
        store.bookTickets(event.id, tier.id, 2, 'Ada');
      }, (err) => err instanceof DomainError && err.code === 'SOLD_OUT');
    });

    it('should reject invalid quantities with VALIDATION', () => {
      const store = createStore();
      const event = store.createEvent({
        title: 'Concert',
        city: 'Lagos',
        venue: 'Arena',
        date: '2026-12-10T19:00:00.000Z'
      });
      const tier = store.addTier(event.id, 'General', 20000, 10);

      assert.throws(() => {
        store.bookTickets(event.id, tier.id, 0, 'Ada');
      }, (err) => err instanceof DomainError && err.code === 'VALIDATION');

      assert.throws(() => {
        store.bookTickets(event.id, tier.id, 11, 'Ada');
      }, (err) => err instanceof DomainError && err.code === 'VALIDATION');
    });
  });

  // Merge Sort Stability & Immutability Test
  describe('Merge Sort Stability & Immutability', () => {
    it('should be stable and return a new array without mutating input', () => {
      const items = [
        { id: 'a', val: 2, name: 'second' },
        { id: 'b', val: 1, name: 'first' },
        { id: 'c', val: 2, name: 'third' }
      ];
      const original = [...items];

      const sorted = mergeSort(items, (x, y) => x.val - y.val);

      // Immutability check
      assert.deepEqual(items, original);
      assert.notStrictEqual(sorted, items);

      // Stability check: items with value 2 ('a' and 'c') should retain original relative order
      assert.equal(sorted[0].val, 1);
      assert.equal(sorted[1].id, 'a');
      assert.equal(sorted[2].id, 'c');
    });

    it('should handle empty lists correctly', () => {
      const sorted = mergeSort([], (a, b) => a - b);
      assert.deepEqual(sorted, []);
    });
  });
});