import { IState } from '../../../../IState';
import { DragonEnemy } from '../../DragonEnemy';
import { Hero } from '../../../../Hero';
import { SoundEffect } from '../../../../SoundEffect';
import { FlyAttackState } from './FlyAttackState';
import { SharedFlyAttackVariables } from './SharedFlyAttackVariables';

/**
 * This state is used to signal an attack before executing the fly attack
 */
export class PreFlyAttackState implements IState {

    private timeSignalingAttack = 0;

    public constructor(private context: FlyAttackState, private dragon: DragonEnemy, private hero: Hero,
                       private attackSignal: SoundEffect, private sharedFlyAttackVariables: SharedFlyAttackVariables) {
    }

    public async Update(delta: number): Promise<void> {
        this.timeSignalingAttack += delta;

        // Wait a few frames after the signal before attacking
        // save hero position before attacking
        if (this.timeSignalingAttack > 10 / 60 * 1000) {
            this.sharedFlyAttackVariables.savedHeroPosition = this.hero.CenterPosition;
            // move to fly attack
            this.timeSignalingAttack = 0;
            await this.context.ChangeState(this.context.FLY_ATTACK_STATE());
        }
    }

    public async Enter(): Promise<void> {
        this.dragon.SignalAttack();
    }

    public async Exit(): Promise<void> {
        await this.attackSignal.Play();
    }
}
