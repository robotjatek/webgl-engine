import { ISequenceStep } from './ISequenceStep';

export class Sequence {
    private steps: ISequenceStep[] = [];

    public AddStep(step: ISequenceStep): Sequence {
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