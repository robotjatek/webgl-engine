import { Sequence } from './Sequence';
import { ActionStep } from './ActionStep';
import { WaitStep } from './WaitStep';
import { ISequenceStep } from './ISequenceStep';

export class SequenceBuilder {
    private sequence: Sequence = new Sequence();

    public Add(sequenceStep: ISequenceStep): SequenceBuilder {
        this.sequence.AddStep(sequenceStep);
        return this;
    }

    public Action(action: (delta: number) => Promise<boolean>): SequenceBuilder {
        this.sequence.AddStep(new ActionStep(action));
        return this;
    }

    public Wait(waitTime: number): SequenceBuilder {
        this.sequence.AddStep(new WaitStep(waitTime));
        return this;
    }

    public Build(): Sequence {
        return this.sequence;
    }
}