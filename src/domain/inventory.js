import { newId, newReference } from './ids.js';
import { DomainError } from './errors.js';
import { Queue } from './waitlistQueue.js';

export function createStore() {
  const events = new Map();
  const bookingsByReference = new Map();

  return {
    createEvent(name, date) {
      if (!name || typeof name !== 'string') {
        throw new DomainError('VALIDATION', 'Event name is required and must be a string.');
      }
      const eventId = newId();
      const event = {
        id: eventId,
        name,
        date,
        tiers: new Map(),
        waitlist: new Queue()
      };
      events.set(eventId, event);
      return event;
    },

    addTier(eventId, name, priceCents, capacity) {
      const event = events.get(eventId);
      if (!event) {
        throw new DomainError('NOT_FOUND', 'Event not found.');
      }
      if (!Number.isInteger(priceCents) || priceCents < 0) {
        throw new DomainError('VALIDATION', 'Price in cents must be a non-negative integer.');
      }
      if (!Number.isInteger(capacity) || capacity < 0) {
        throw new DomainError('VALIDATION', 'Capacity must be a non-negative integer.');
      }

      const tierId = newId();
      const tier = {
        id: tierId,
        name,
        priceCents,
        capacity,
        soldCount: 0
      };
      event.tiers.set(tierId, tier);
      return tier;
    },

    bookTickets(eventId, tierId, quantity, attendeeName) {
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
        throw new DomainError('VALIDATION', 'Booking quantity must be an integer between 1 and 10.');
      }
      if (!attendeeName || typeof attendeeName !== 'string') {
        throw new DomainError('VALIDATION', 'Attendee name is required.');
      }

      const event = events.get(eventId);
      if (!event) {
        throw new DomainError('NOT_FOUND', 'Event not found.');
      }
      const tier = event.tiers.get(tierId);
      if (!tier) {
        throw new DomainError('NOT_FOUND', 'Ticket tier not found.');
      }

      // Check capacity rule: if not enough seats, throw SOLD_OUT and change nothing
      if (tier.soldCount + quantity > tier.capacity) {
        throw new DomainError('SOLD_OUT', 'Not enough seats available in this tier.');
      }

      // Commit changes atomically
      tier.soldCount += quantity;
      const reference = newReference();
      const bookingId = newId();
      const booking = {
        id: bookingId,
        reference,
        eventId,
        tierId,
        quantity,
        attendeeName,
        status: 'CONFIRMED'
      };

      bookingsByReference.set(reference, booking);
      return booking;
    },

    cancelBooking(reference) {
      if (!reference || typeof reference !== 'string') {
        throw new DomainError('VALIDATION', 'Reference code is required.');
      }
      const booking = bookingsByReference.get(reference);
      if (!booking) {
        throw new DomainError('NOT_FOUND', 'Booking not found.');
      }
      if (booking.status === 'CANCELLED') {
        throw new DomainError('ALREADY_CANCELLED', 'Booking has already been cancelled.');
      }

      const event = events.get(booking.eventId);
      const tier = event.tiers.get(booking.tierId);

      // Release seats
      tier.soldCount -= booking.quantity;
      booking.status = 'CANCELLED';
      return booking;
    },

    findBookingByReference(reference) {
      if (!reference || typeof reference !== 'string') {
        throw new DomainError('VALIDATION', 'Reference code is required.');
      }
      const booking = bookingsByReference.get(reference);
      if (!booking) {
        throw new DomainError('NOT_FOUND', 'Booking not found.');
      }
      return booking;
    },

    joinWaitlist(eventId, attendeeName) {
      if (!attendeeName || typeof attendeeName !== 'string') {
        throw new DomainError('VALIDATION', 'Attendee name is required.');
      }
      const event = events.get(eventId);
      if (!event) {
        throw new DomainError('NOT_FOUND', 'Event not found.');
      }

      const waitlistEntry = { attendeeName, joinedAt: new Date() };
      event.waitlist.enqueue(waitlistEntry);
      return waitlistEntry;
    },

    getNextInWaitlist(eventId) {
      const event = events.get(eventId);
      if (!event) {
        throw new DomainError('NOT_FOUND', 'Event not found.');
      }
      return event.waitlist.peek();
    },

    dequeueWaitlist(eventId) {
      const event = events.get(eventId);
      if (!event) {
        throw new DomainError('NOT_FOUND', 'Event not found.');
      }
      return event.waitlist.dequeue();
    }
  };
}