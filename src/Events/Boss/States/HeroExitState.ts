import { IState } from '../../../Enemies/IState';
import { Level } from '../../../Level';
import { Hero } from '../../../Hero';
import { vec3 } from 'gl-matrix';

/**
 * Moves the hero to the exit. No state change after that.
 */
export class HeroExitState implements IState {

    public constructor(private level: Level, private hero: Hero) {
    }

    public async Update(delta: number): Promise<void> {
        this.level.MainLayer.SetCollision(29, 11, false);
        this.level.MainLayer.SetCollision(29, 12, false);
        this.level.MainLayer.SetCollision(29, 13, false);
        this.level.MainLayer.SetCollision(29, 14, false);
        this.hero.Move(vec3.fromValues(0.01, 0, 0), delta);
    }

    public async Enter(): Promise<void> {
    }

    public async Exit(): Promise<void> {
    }
}