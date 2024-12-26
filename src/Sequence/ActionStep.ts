import { SequenceStep } from './SequenceStep';

/**
 * Generic action step with custom logic
 */
export class ActionStep implements SequenceStep {

    public constructor(private action: (delta: number) => Promise<boolean>) {
    }

    public async Update(delta: number): Promise<boolean> {
        return await this.action(delta);
    }

}