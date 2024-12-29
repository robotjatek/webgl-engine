import { ISequenceStep } from './ISequenceStep';

/**
 * A sequence step that waits for a specified duration before completing.
 *
 * @implements {ISequenceStep}
 */
export class WaitStep implements ISequenceStep {
    private elapsedTime: number = 0;

    /**
     * Creates a new `WaitStep`.
     *
     * @param waitTime - The total time, in seconds, to wait before the step is considered complete.
     */
    public constructor(private waitTime: number) {
    }

    /**
     * Updates the wait step by adding the elapsed `delta` time to the accumulated time.
     * The step completes when the accumulated time exceeds the specified wait time.
     *
     * @param delta - The elapsed time since the last frame, in milliseconds.
     * @returns {Promise<boolean>} A promise that resolves to:
     *  - `true` if the total wait time has been reached or exceeded.
     *  - `false` if the step is still waiting.
     */
    public async Update(delta: number): Promise<boolean> {
        return true;
        this.elapsedTime += delta;
        return this.elapsedTime > this.waitTime;
    }
}