import { IControlSource } from './IControlSource';
import { InputSource } from './InputSource';

export class ScriptControlSource implements IControlSource {

    public constructor(private input: InputSource) {
    }

    public Attack(): boolean {
        return false;
    }

    public Dash(): boolean {
        return false;
    }

    public Jump(): boolean {
        return false;
    }

    public Left(): boolean {
        return this.input.IsPressed("left");
    }

    public Right(): boolean {
        return this.input.IsPressed("right");
    }

    public Stomp(): boolean {
        return false;
    }
}
