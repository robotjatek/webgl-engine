/**
 * Interface for defining custom steps for {@link Sequence}.
 * For simple steps you can use {@link ActionStep} instead.
 */
export interface ISequenceStep {
    /**
     * Update loop for a sequence step. Works like a regular game loop update.
     * Each call processes a portion of the step's work for the given elapsed time.
     * It is expected to be called multiple times until the step is completed.
     * @param delta The elapsed time since the last frame, in milliseconds
     * @returns {Promise<boolean>} A promise that resolves to
     *  - `true` if the step is finished
     *  - `false` if the step did not completed its work yet
     */
    Update(delta: number): Promise<boolean>;
}