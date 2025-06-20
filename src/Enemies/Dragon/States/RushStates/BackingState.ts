import { vec3 } from 'gl-matrix';
import { Hero } from 'src/Hero';
import { SoundEffect } from 'src/SoundEffect';
import { DragonEnemy } from '../../DragonEnemy';
import { DragonStateBase } from '../DragonStateBase';
import { IState } from '../../../IState';
import { RushState } from './RushState';

export class BackingState extends DragonStateBase implements IState {

    private timeInBacking = 0;

    public constructor(hero: Hero, dragon: DragonEnemy, private context: RushState, private backingStartSound: SoundEffect) {
        super(hero, dragon);
    }

    public override async Update(delta: number): Promise<void> {
        this.timeInBacking += delta;
        const dir = vec3.sub(vec3.create(), this.dragon.CenterPosition, this.hero.CenterPosition);
        if (dir[0] > 0) {
            this.dragon.Move(vec3.fromValues(0.000475, 0, 0), delta);
        } else if (dir[0] < 0) {
            this.dragon.Move(vec3.fromValues(-0.000475, 0, 0), delta);
        }

        if (this.timeInBacking > 1500 ||
            (vec3.distance(this.dragon.CenterPosition, this.hero.CenterPosition) > 15 &&
                this.timeInBacking > 500)) {
            this.timeInBacking = 0;
            await this.context.ChangeState(this.context.CHARGE_STATE());
        }

        this.MatchHeroHeight(delta);
    }

    public async Enter(): Promise<void> {
        this.dragon.SignalAttack();
        this.timeInBacking = 0;
        await this.backingStartSound.Play(1.0, 0.3);
    }

    public async Exit(): Promise<void> {
        this.timeInBacking = 0;
    }
}
