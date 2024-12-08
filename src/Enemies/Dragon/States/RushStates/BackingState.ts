import { vec3 } from 'gl-matrix';
import { Hero } from 'src/Hero';
import { SoundEffect } from 'src/SoundEffect';
import { DragonEnemy } from '../../DragonEnemy';
import { DragonStateBase } from '../DragonStateBase';
import { IState } from '../IState';
import { SharedDragonStateVariables } from '../SharedDragonStateVariables';
import { RushState } from './RushState';

export class BackingState extends DragonStateBase implements IState {

    private timeInBacking = 0;

    public constructor(hero: Hero, dragon: DragonEnemy, private context: RushState, private backingStartSound: SoundEffect) {
        super(hero, dragon);
    }

    public async Update(delta: number, shared: SharedDragonStateVariables): Promise<void> {
        this.timeInBacking += delta;
        const dir = vec3.sub(vec3.create(), this.dragon.CenterPosition, this.hero.CenterPosition);
        if (dir[0] > 0) {
            this.dragon.Move(vec3.fromValues(0.025, 0, 0), delta);;
        } else if (dir[0] < 0) {
            this.dragon.Move(vec3.fromValues(-0.025, 0, 0), delta);
        }

        if (this.timeInBacking > 1500 ||
            (vec3.distance(this.dragon.CenterPosition, this.hero.CenterPosition) > 15 &&
                this.timeInBacking > 500)
        ) {
            this.timeInBacking = 0;

            this.context.ChangeState(this.context.CHARGE_STATE());
        }

        this.MatchHeroHeight(delta);
    }

    public Enter(): void {
        this.timeInBacking = 0;
        this.backingStartSound.Play(1.0, 0.3);
    }

    public Exit(): void {
        this.timeInBacking = 0;
    }
}
