import { IState } from '../../../IState';
import { Level } from '../../../Level';
import { Hero } from '../../../Hero/Hero';

import { InputSource } from '../../../Components/Input/InputSource';

/**
 * Moves the hero to the exit. No state change after that.
 */
export class HeroExitState implements IState {

    private readonly input: InputSource;

    public constructor(private level: Level, private hero: Hero, private props: Record<string, any>) {
        this.input = this.hero.TakeoverControl();
    }

    public async Update(delta: number): Promise<void> {

        const blockedTiles = this.props['blockedTiles'] as { xPos: number, yPos: number }[];
        blockedTiles.forEach(x => {
            const xPos = Number(x.xPos);
            const yPos = Number(x.yPos);
            this.level.MainLayer.SetCollision(xPos, yPos, false);
        });

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
