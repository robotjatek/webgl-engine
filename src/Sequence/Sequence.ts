import { SequenceStep } from './SequenceStep';

export class Sequence {
    private steps: SequenceStep[] = [];

    public AddStep(step: SequenceStep): Sequence {
        this.steps.push(step);
        return this;
    }

    public async Update(delta: number): Promise<boolean> {
        if (this.steps.length == 0) {
            return true;
        }

        const currentStep = this.steps[0];
        if (await currentStep.Update(delta)) {
            this.steps.shift();
        }

        return false;
    }
}