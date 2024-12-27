import { ISequenceStep } from './ISequenceStep';


/**
 * A class that manages and executes a sequence of steps defined by {@link ISequenceStep}.
 *
 * Each step is updated sequentially, and the sequence progresses to the next step
 * when the current step is completed. The sequence is considered complete when all
 * steps have finished.
 */
export class Sequence {
    private steps: ISequenceStep[] = [];

    /**
     * Adds a new step to the sequence.
     *
     * @param step - The step to add, implementing {@link ISequenceStep}.
     * @returns {Sequence} The current sequence instance, allowing for method chaining.
     */
    public AddStep(step: ISequenceStep): Sequence {
        this.steps.push(step);
        return this;
    }

    /**
     * Updates the current step in the sequence.
     *
     * If the current step is completed, it is removed from the sequence,
     * and the next step becomes active. This process continues until all steps
     * have been completed.
     *
     * @param delta - The elapsed time since the last update, in milliseconds.
     * @returns {Promise<boolean>} A promise that resolves to:
     *  - `true` if all steps in the sequence have been completed.
     *  - `false` if there are still steps remaining.
     */
    public async Update(delta: number): Promise<boolean> {
        if (this.steps.length === 0) {
            return true;
        }

        const currentStep = this.steps[0];
        if (await currentStep.Update(delta)) {
            this.steps.shift();
        }

        return false;
    }
}