import { vec3 } from 'gl-matrix';
import { Hero } from 'src/Hero';
import { SoundEffect } from 'src/SoundEffect';
import { DragonEnemy } from '../../DragonEnemy';
import { DragonStateBase } from '../DragonStateBase';
import { IState } from '../../../IState';
import { SharedDragonStateVariables } from '../SharedDragonStateVariables';
import { RushState } from './RushState';

export class ChargeState extends DragonStateBase implements IState {

    public constructor(hero: Hero, dragon: DragonEnemy, private context: RushState, private rushSound: SoundEffect,
                       private shared: SharedDragonStateVariables) {
        super(hero, dragon);
    }

    public override async Update(delta: number): Promise<void> {
        this.shared.timeSinceLastAttack = 0;
        this.shared.timeSinceLastCharge = 0;
        const dir = vec3.sub(vec3.create(), this.dragon.CenterPosition, this.hero.CenterPosition);
        if (dir[0] > 0) {
            this.dragon.Move(vec3.fromValues(-0.035, 0, 0), delta);
        } else if (dir[0] < 0) {
            this.dragon.Move(vec3.fromValues(0.035, 0, 0), delta);
        }

        // Move out of charge state when distance on the Y axis is close enough
        const distanceOnX = Math.abs(this.dragon.CenterPosition[0] - this.hero.CenterPosition[0]);
        if (distanceOnX < 3) {
            this.context.ChangeState(this.context.PREATTACK_STATE());
        }
    }

    public Enter(): void {
        this.rushSound.Play();
    }

    public Exit(): void {
        // Do nothing
    }
}
