import { Hero } from 'src/Hero';
import { DragonStateBase } from '../DragonStateBase';
import { IState } from '../../../IState';
import { SharedDragonStateVariables } from '../SharedDragonStateVariables';
import { DragonEnemy } from '../../DragonEnemy';
import { vec3 } from 'gl-matrix';
import { SoundEffect } from '../../../../SoundEffect';
import { IProjectile } from '../../../../Projectiles/IProjectile';
import { ICollider } from '../../../../ICollider';
import { ReachAltitudeState } from './ReachAltitudeState';
import { SweepingState } from './SweepingState';
import { PreFlyAttackState } from './PreFlyAttackState';
import { AttackState } from './AttackState';
import { SharedFlyAttackVariables } from './SharedFlyAttackVariables';

// TODO: 125 TODOs in 12/01 on boss_event branch
export class FlyAttackState extends DragonStateBase implements IState {

    public REACH_ALTITUDE_STATE(): IState {
        return new ReachAltitudeState(this, this.dragon);
    }

    public SWEEPING_STATE(): IState {
        return new SweepingState(this, this.dragon, this.spawnProjectile, this.collider, this.shared);
    }

    public PRE_FLY_ATTACK_STATE(): IState {
        return new PreFlyAttackState(this, this.dragon, this.hero, this.attackSignal, this.sharedFlyAttackVariables);
    }

    public FLY_ATTACK_STATE(): IState {
        return new AttackState(this, this.dragon, this.sharedFlyAttackVariables);
    }

    public ChangeState(state: IState): void {
        this.internalState.Exit();
        this.internalState = state;
        this.internalState.Enter();
    }

    private internalState: IState = this.REACH_ALTITUDE_STATE();

    private sharedFlyAttackVariables: SharedFlyAttackVariables = {
        savedHeroPosition: vec3.create()
    }

    private savedHeroPosition: vec3;

    public constructor(hero: Hero,
                       dragon: DragonEnemy,
                       private attackSignal: SoundEffect,
                       private collider: ICollider,
                       private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void,
                       private shared: SharedDragonStateVariables) {
        super(hero, dragon);
        this.sharedFlyAttackVariables.savedHeroPosition = hero.CenterPosition;
        this.savedHeroPosition = hero.CenterPosition;
    }

    public override async Update(delta: number): Promise<void> {
        await this.internalState.Update(delta);
    }

    public Enter(): void {
    }

    public Exit(): void {
    }

}