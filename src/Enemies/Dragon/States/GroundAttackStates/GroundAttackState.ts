import { DragonStateBase } from '../DragonStateBase';
import { IState } from '../../../IState';
import { SharedDragonStateVariables } from '../SharedDragonStateVariables';
import { Hero } from '../../../../Hero';
import { DragonEnemy } from '../../DragonEnemy';
import { vec3 } from 'gl-matrix';
import { ICollider } from '../../../../ICollider';
import { IProjectile } from '../../../../Projectiles/IProjectile';
import { SweepingState } from './SweepingState';
import { AttackState } from './AttackState';

export class GroundAttackState extends DragonStateBase implements IState {

    public SWEEPING_STATE(): IState {
        return new SweepingState(this, this.hero, this.dragon, this.collider, this.spawnProjectile, this.shared);
    }

    public ATTACK_STATE(): IState {
        return new AttackState(this.dragon);
    }

    public ChangeState(state: IState): void {
        this.internalState.Exit();
        this.internalState = state;
        this.internalState.Enter();
    }

    private internalState: IState = this.SWEEPING_STATE();
    private dir = vec3.fromValues(-0.01, 0, 0);

    public constructor(hero: Hero,
                       dragon: DragonEnemy,
                       private collider: ICollider,
                       private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void,
                       private shared: SharedDragonStateVariables) {
        super(hero, dragon);
    }

    public override async Update(delta: number): Promise<void> {
        // Move left and right. Change direction when colliding with a wall
        if (this.dragon.WillCollide(this.dir, delta)) {
            this.dir = vec3.fromValues(this.dir[0] * -1, 0, 0);
        }
        this.dragon.Move(this.dir, delta);
        this.MatchHeroHeight(delta);

        await this.internalState.Update(delta);
    }

    public Enter(): void {
    }

    public Exit(): void {
    }
}