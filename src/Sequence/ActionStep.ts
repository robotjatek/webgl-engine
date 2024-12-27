import { ISequenceStep } from './ISequenceStep';

/**
 * Generic action step with custom logic. This class typically used for simple, one-liner
 * actions where creating a dedicated class would be excessive.
 *
 * @implements {ISequenceStep}
 */
export class ActionStep implements ISequenceStep {

    /**
     * Creates a new `ActionStep`
     *
     * @param action - A function representing the custom logic for the step.
     * It receives the elapsed time (`delta`) as a parameter and must return a `Promise<boolean>`:
     *  - `true` if the action is complete.
     *  - `false` if the action requires additional updates.
     */
    public constructor(private action: (delta: number) => Promise<boolean>) {
    }

    /**
     * @inheritDoc
     */
    public async Update(delta: number): Promise<boolean> {
        return await this.action(delta);
    }

}