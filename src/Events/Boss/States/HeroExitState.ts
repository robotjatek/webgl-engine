import { IState } from '../../../IState';
import { Level } from '../../../Level';
import { Hero } from '../../../Hero';

import { InputSource } from '../../../Components/Input/InputSource';

/**
 * Moves the hero to the exit. No state change after that.
 */
export class HeroExitState implements IState {

    private readonly input: InputSource;

    public constructor(private level: Level, private hero: Hero) {
        this.input = this.hero.TakeoverControl();
    }

    public async Update(delta: number): Promise<void> {
        this.level.MainLayer.SetCollision(29, 11, false);
        this.level.MainLayer.SetCollision(29, 12, false);
        this.level.MainLayer.SetCollision(29, 13, false);
        this.level.MainLayer.SetCollision(29, 14, false);
        this.hero.Speed = 0.0004;
        this.input.PressKey("right");
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
        this.hero.ReleaseControl();
        this.hero.Speed = this.hero.DEFAULT_SPEED;
    }
}
