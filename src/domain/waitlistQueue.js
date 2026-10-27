class ListNode {
  constructor(value) {
    this.value = value;
    this.next = null;
  }
}

export class Queue {
  #head = null;
  #tail = null;
  #size = 0;

  enqueue(value) {
    const newNode = new ListNode(value);
    if (!this.#head) {
      this.#head = newNode;
      this.#tail = newNode;
    } else {
      this.#tail.next = newNode;
      this.#tail = newNode;
    }
    this.#size++;
  }

  dequeue() {
    if (!this.#head) {
      return undefined;
    }
    const value = this.#head.value;
    this.#head = this.#head.next;
    this.#size--;
    if (!this.#head) {
      this.#tail = null;
    }
    return value;
  }

  peek() {
    return this.#head ? this.#head.value : undefined;
  }

  size() {
    return this.#size;
  }
}