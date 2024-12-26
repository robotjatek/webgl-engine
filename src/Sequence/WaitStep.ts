import { ISequenceStep } from './ISequenceStep';

export class WaitStep implements ISequenceStep {
    private elapsedTime: number = 0;

    public constructor(private waitTime: number) {
    }

    public async Update(delta: number): Promise<boolean> {
        this.elapsedTime += delta;
        return this.elapsedTime > this.waitTime;
    }
}