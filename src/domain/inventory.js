import { newId, newReference } from './ids.js';
import { DomainError } from './errors.js';
import { Queue } from './waitlistQueue.js';

export function createStore() {
  const events = new Map();
  const bookingsByReference = new Map();

  return {
    createEvent({ title, city, venue, date }) {
      if (!title || typeof title !== 'string' || !city || typeof city !== 'string' || !venue || typeof venue !== 'string') {
        throw new DomainError('VALIDATION', 'Title, city, and venue are required strings.');
      }

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new DomainError('VALIDATION', 'Date must be a valid date.');
      }

      const eventId = newId();
      const event = {
        id: eventId,
        title,
        city,
        venue,
        date: parsedDate.toISOString(),
        status: 'draft',
        tiers: new Map(),
        waitlist: new Queue()
      };
      events.set(eventId, event);
      return event;
    },

    publishEvent(eventId) {
      const event = events.get(eventId);
      if (!event) {
        throw new DomainError('NOT_FOUND', 'Event not found.');
      }
      if (event.tiers.size === 0) {
        throw new DomainError('INVALID_STATE', 'Cannot publish an event with no ticket tiers.');
      }
      event.status = 'published';
      return event;
    },

    unpublishEvent(eventId) {
      const event = events.get(eventId);
      if (!event) {
        throw new DomainError('NOT_FOUND', 'Event not found.');
      }
      event.status = 'draft';

      // Refund all bookings associated with this event and reset sold counts
      for (const tier of event.tiers.values()) {
        tier.soldCount = 0;
      }

      for (const booking of bookingsByReference.values()) {
        if (booking.eventId === eventId && booking.status !== 'CANCELLED') {
          booking.status = 'REFUNDED';
        }
      }

      return event;
    },

    listEventSummaries({ publishedOnly = true } = {}) {
      const summaries = [];

      for (const event of events.values()) {
        if (publishedOnly && event.status !== 'published') {
          continue;
        }

        let cheapestPriceCents = null;
        let totalSeatsLeft = 0;

        for (const tier of event.tiers.values()) {
          const seatsLeft = tier.capacity - tier.soldCount;
          totalSeatsLeft += seatsLeft;
          if (cheapestPriceCents === null || tier.priceCents < cheapestPriceCents) {
            cheapestPriceCents = tier.priceCents;
          }
        }

        summaries.push({
          id: event.id,
          title: event.title,
          city: event.city,
          venue: event.venue,
          date: event.date,
          status: event.status,
          cheapestPriceCents,
          totalSeatsLeft,
          tierCount: event.tiers.size
        });
      }

      return summaries;
    },

    addTier(eventId, name, priceCents, capacity) {
      const event = events.get(eventId);
      if (!event) {
        throw new DomainError('NOT_FOUND', 'Event not found.');
      }
      if (!Number.isInteger(priceCents) || priceCents < 0) {
        throw new DomainError('VALIDATION', 'Price in cents must be a non-negative integer.');
      }
      if (!Number.isInteger(capacity) || capacity < 1) {
        throw new DomainError('VALIDATION', 'Capacity must be at least 1.');
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

      if (tier.soldCount + quantity > tier.capacity) {
        throw new DomainError('SOLD_OUT', 'Not enough seats available in this tier.');
      }

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