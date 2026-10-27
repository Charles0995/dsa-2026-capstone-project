# AI Log

## Build 1: Domain Core in the Terminal

 **Prompt:** Asked the AI partner to structure and implement Build 1 of the capstone project using vanilla ES modules and Node.js without external packages, including the custom `DomainError` class, cryptographic ID/reference generators, a $O(1)$ linked-list queue for waitlists, inventory business logic with strict capacity rules, and terminal demo/benchmark scripts.

 **What came back:** A complete set of modular files covering domain errors, ID generation, a pointer-based linked list queue, pure store management with Map lookups, and runnable terminal scripts.

 **What was wrong / adjustments:** Nothing major; the logic successfully handled the capacity limits, atomic rollbacks on failure, and $O(1)$ reference lookups on the first run. Verified the dependency constraints (`type: "module"`, zero external packages).


## Build 2

### Prompt 1: Build 2 prompt (docs/build-2.md)

 **What I asked:** How to configure the test script in `package.json` without breaking existing scripts, and how to fix a failing price filter test where tierless events were incorrectly evaluating to `0` instead of `null`.

 **What came back:** Instructions on safely adding `"test": "node --test"` alongside the demo and benchmark scripts, plus the updated `listEventSummaries` logic to ensure `cheapestPriceCents` remains `null` for events with no tiers.

 **What was wrong (or "nothing"):** Nothing; the code adjustments and configuration resolved the assertion failure cleanly.

### Prompt 2:

**What I asked:** Why the date-sorting tie-breaker test failed with `actual: '3', expected: '2'` and how to adjust the test data so the tie-breaking logic triggers properly.

**What came back:** An explanation that the event timestamps had different hours (preventing a date tie), accompanied by the updated test data with synchronized timestamps for items 2 and 3.

**What was wrong (or "nothing"):** Nothing; aligning the timestamps allowed the title-based tie-breaker to execute correctly, bringing the test suite to a full 19/19 passing status.
