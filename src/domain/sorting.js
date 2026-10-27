// src/domain/sorting.js

export function mergeSort(items, compare) {
  if (!Array.isArray(items)) {
    throw new TypeError('Items must be an array');
  }
  if (typeof compare !== 'function') {
    throw new TypeError('Compare must be a function');
  }

  // Base case: arrays with 0 or 1 element are already sorted
  if (items.length <= 1) {
    return [...items];
  }

  const mid = Math.floor(items.length / 2);
  const left = mergeSort(items.slice(0, mid), compare);
  const right = mergeSort(items.slice(mid), compare);

  return merge(left, right, compare);
}

function merge(left, right, compare) {
  const result = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    // Using <= ensures stability (if elements are equal, left comes first)
    if (compare(left[i], right[j]) <= 0) {
      result.push(left[i]);
      i++;
    } else {
      result.push(right[j]);
      j++;
    }
  }

  // Collect remaining elements
  while (i < left.length) {
    result.push(left[i]);
    i++;
  }

  while (j < right.length) {
    result.push(right[j]);
    j++;
  }

  return result;
}