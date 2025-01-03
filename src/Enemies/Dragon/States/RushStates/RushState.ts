import { Hero } from 'src/Hero';
import { IProjectile } from 'src/Projectiles/IProjectile';
import { SoundEffect } from 'src/SoundEffect';
import { DragonEnemy } from '../../DragonEnemy';
import { IState } from '../../../IState';
import { SharedDragonStateVariables } from '../SharedDragonStateVariables';
import { DragonStateBase } from '../DragonStateBase';
import { StartState } from './StartState';
import { BackingState } from './BackingState';
import { ChargeState } from './ChargeState';
import { PreAttackState } from './PreAttackState';
import { AttackState } from './AttackState';
import { vec3 } from 'gl-matrix';

export class RushState extends DragonStateBase implements IState {
    public START_STATE = () => new StartState(this.hero, this.dragon, this);
    public BACKING_STATE = () => new BackingState(this.hero, this.dragon, this, this.backingStartSound);
    public CHARGE_STATE = () => new ChargeState(this.hero, this.dragon, this, this.rushSound, this.shared);
    public PREATTACK_STATE = () => new PreAttackState(this.hero, this.dragon, this);
    public ATTACK_STATE = () => new AttackState(this.hero, this.dragon, this, this.biteAttackSound,
        this.spawnProjectile, this.shared);

    private internalState: IState = this.START_STATE();

    public constructor(
        hero: Hero,
        dragon: DragonEnemy,
        private rushSound: SoundEffect,
        private backingStartSound: SoundEffect,
        private biteAttackSound: SoundEffect,
        private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void,
        private shared: SharedDragonStateVariables
    ) {
        super(hero, dragon);
    }

    public async ChangeState(state: IState): Promise<void> {
        await this.internalState.Exit();
        this.internalState = state;
        await this.internalState.Enter();
    }

    public async Update(delta: number): Promise<void> {
        await this.internalState.Update(delta);

        const dir = vec3.sub(vec3.create(), this.dragon.CenterPosition, this.hero.CenterPosition);
        const distance = vec3.distance(this.dragon.CenterPosition, this.hero.CenterPosition);
        if (distance > 3) {
            if (dir[0] > 0) {
                this.dragon.Move(vec3.fromValues(-0.003, 0, 0), delta);
            } else if (dir[0] < 0) {
                this.dragon.Move(vec3.fromValues(0.003, 0, 0), delta);
            }
        }
    }

    public async Enter(): Promise<void> {
        this.internalState = this.START_STATE();
    }

    public async Exit(): Promise<void> {
        // Do nothing
    }
}
