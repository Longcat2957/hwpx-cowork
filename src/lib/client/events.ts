import type { EventListener, JobEvent } from '#lib/contracts/events.js';

/** Shared event cursor behavior for the mock stream and the future SSE adapter. */
export function createEventCursor(afterSequence = 0) {
    let sequence = afterSequence;
    return {
        get sequence() {
            return sequence;
        },
        accept(event: JobEvent, listener: EventListener): boolean {
            if (event.sequence <= sequence) {
                return false;
            }
            sequence = event.sequence;
            listener(event);
            return true;
        }
    };
}
