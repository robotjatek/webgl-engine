import { Hero } from 'src/Hero/Hero';
import { IProjectile } from 'src/Projectiles/IProjectile';
import { SoundEffect } from 'src/SoundEffect';
import { DragonEnemy } from '../../DragonEnemy';
import { IState } from '../../../../IState';
import { SharedDragonStateVariables } from '../SharedDragonStateVariables';
import { DragonStateBase } from '../DragonStateBase';
import { StartState } from './StartState';
import { BackingState } from './BackingState';
import { ChargeState } from './ChargeState';
import { PreAttackState } from './PreAttackState';
import { AttackState } from './AttackState';

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
    }

    public async Enter(): Promise<void> {
        this.internalState = this.START_STATE();
    }

    public async Exit(): Promise<void> {
        // Do nothing
    }
}
