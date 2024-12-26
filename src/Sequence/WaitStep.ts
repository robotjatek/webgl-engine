import { SequenceStep } from './SequenceStep';

export class WaitStep implements SequenceStep {
    private elapsedTime: number = 0;

    public constructor(private waitTime: number) {
    }

    public async Update(delta: number): Promise<boolean> {
        this.elapsedTime += delta;
        return this.elapsedTime > this.waitTime;
    }
}