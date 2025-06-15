import { Hero } from 'src/Hero';
import { DragonEnemy } from '../DragonEnemy';
import { vec3 } from 'gl-matrix';

export abstract class DragonStateBase {

    protected constructor(protected hero: Hero, protected dragon: DragonEnemy) {}

    abstract Update(delta: number): Promise<void>;

    /**
     * Follow hero on the Y axis with a little delay.
     * "Delay" is achieved by moving the dragon slower than the hero movement speed.
     */
    protected MatchHeroHeight(): void {
        // Reduce shaking by only moving when the distance is larger than a limit
        const distance = Math.abs(this.hero.CenterPosition[1] - this.dragon.CenterPosition[1]);
        if (distance > 0.2) {
            const dir = vec3.sub(vec3.create(), this.dragon.CenterPosition, this.hero.CenterPosition);
            if (dir[1] > 0) {
                this.dragon.MoveVertical(-0.003);
            } else if (dir[1] < 0) {
                this.dragon.MoveVertical(0.003);
            }
        }
    }
}
