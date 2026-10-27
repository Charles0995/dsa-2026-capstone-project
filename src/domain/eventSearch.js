// src/domain/eventSearch.js
import { DomainError } from './errors.js';
import { mergeSort } from './sorting.js';

/**
 * Filters event summaries based on search and filter criteria.
 */
export function filterEvents(summaries, criteria = {}) {
  if (!Array.isArray(summaries)) {
    throw new DomainError('VALIDATION', 'Summaries must be an array.');
  }

  const { q, city, from, to, maxPriceCents, onlyAvailable } = criteria;

  // Validate dates if provided
  let fromDate = null;
  if (from) {
    fromDate = new Date(from);
    if (isNaN(fromDate.getTime())) {
      throw new DomainError('VALIDATION', 'Invalid "from" date.');
    }
  }

  let toDate = null;
  if (to) {
    toDate = new Date(to);
    if (isNaN(toDate.getTime())) {
      throw new DomainError('VALIDATION', 'Invalid "to" date.');
    }
    // If it's a date-only string or we want to include the whole day, extend to end of day
    if (typeof to === 'string' && to.length === 10) {
      toDate.setUTCHours(23, 59, 59, 999);
    }
  }

  // Validate maxPriceCents if provided
  if (maxPriceCents !== undefined && maxPriceCents !== null) {
    if (!Number.isInteger(maxPriceCents) || maxPriceCents < 0) {
      throw new DomainError('VALIDATION', 'maxPriceCents must be a whole number integer.');
    }
  }

  return summaries.filter(event => {
    // Text search (q) in title or venue (case-insensitive)
    if (q) {
      const query = q.toLowerCase();
      const matchTitle = event.title && event.title.toLowerCase().includes(query);
      const matchVenue = event.venue && event.venue.toLowerCase().includes(query);
      if (!matchTitle && !matchVenue) return false;
    }

    // City filter (exact match, case-insensitive)
    if (city) {
      if (!event.city || event.city.toLowerCase() !== city.toLowerCase()) {
        return false;
      }
    }

    // Date range filter
    if (fromDate || toDate) {
      const eventDate = new Date(event.date);
      if (isNaN(eventDate.getTime())) return false;
      if (fromDate && eventDate < fromDate) return false;
      if (toDate && eventDate > toDate) return false;
    }

    // Max price filter (events with no tiers/price are left out)
    if (maxPriceCents !== undefined && maxPriceCents !== null) {
      if (event.cheapestPriceCents === null || event.cheapestPriceCents === undefined || event.cheapestPriceCents > maxPriceCents) {
        return false;
      }
    }

    // Availability filter
    if (onlyAvailable) {
      if (!event.totalSeatsLeft || event.totalSeatsLeft <= 0) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Sorts event summaries using custom mergeSort with tie-breaking.
 */
export function sortEvents(summaries, sortBy) {
  if (!Array.isArray(summaries)) {
    throw new DomainError('VALIDATION', 'Summaries must be an array.');
  }

  if (!sortBy) {
    return [...summaries];
  }

  if (!['date', 'price', 'availability'].includes(sortBy)) {
    throw new DomainError('VALIDATION', 'Unknown sortBy option.');
  }

  return mergeSort(summaries, (a, b) => {
    let primaryComparison = 0;

    if (sortBy === 'date') {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      primaryComparison = dateA - dateB;
    } else if (sortBy === 'price') {
      const priceA = a.cheapestPriceCents !== null && a.cheapestPriceCents !== undefined ? a.cheapestPriceCents : Infinity;
      const priceB = b.cheapestPriceCents !== null && b.cheapestPriceCents !== undefined ? b.cheapestPriceCents : Infinity;
      primaryComparison = priceA - priceB;
    } else if (sortBy === 'availability') {
      const seatsA = a.totalSeatsLeft || 0;
      const seatsB = b.totalSeatsLeft || 0;
      primaryComparison = seatsB - seatsA; // Most seats left first
    }

    if (primaryComparison !== 0) {
      return primaryComparison;
    }

    // Tie-breaker 1: Title (alphabetical)
    const titleA = a.title || '';
    const titleB = b.title || '';
    const titleComparison = titleA.localeCompare(titleB);
    if (titleComparison !== 0) {
      return titleComparison;
    }

    // Tie-breaker 2: ID
    const idA = a.id || '';
    const idB = b.id || '';
    return idA.localeCompare(idB);
  });
}

/**
 * Filters then sorts event summaries.
 */
export function searchEvents(summaries, criteria = {}, sortBy) {
  const filtered = filterEvents(summaries, criteria);
  return sortEvents(filtered, sortBy);
}