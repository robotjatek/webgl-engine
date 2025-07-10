import { HeroBaseState } from './HeroBaseState';
import { Hero } from '../../Hero';
import { IProjectile } from '../../Projectiles/IProjectile';
import { PhysicsComponent } from '../../Components/PhysicsComponent';
import { DamageComponent } from '../../Components/DamageComponent';
import { Animation } from '../../Components/Animation';
import { SharedHeroStateVariables } from './SharedHeroStateVariables';

export class IdleState extends HeroBaseState {

    public constructor(hero: Hero,
                       spawnProjectile: (sender: Hero, projectile: IProjectile) => void,
                       physicsComponent: PhysicsComponent,
                       damageComponent: DamageComponent,
                       sharedStateVariables: SharedHeroStateVariables,
                       private animation: Animation) {
        super(hero, physicsComponent, damageComponent, spawnProjectile, sharedStateVariables);
    }

    protected async UpdateState(delta: number): Promise<void> {
        if (this.hero.InputSource.Left()) {
            this.movementBehaviour.MoveLeft(delta);
            await this.hero.ChangeState(this.hero.WALK_STATE());
        } else if (this.hero.InputSource.Right()) {
            this.movementBehaviour.MoveRight(delta);
            await this.hero.ChangeState(this.hero.WALK_STATE());
        } else if (this.hero.InputSource.Jump()) {
            await this.hero.ChangeState(this.hero.JUMP_STATE());
        } else if (this.hero.InputSource.Stomp() &&
            this.sharedStateVariables.timeSinceLastStomp > 500 &&
            !this.physicsComponent.OnGround) {
            await this.hero.ChangeState(this.hero.STOMP_STATE());
        }

        if (this.physicsComponent.OnGround && this.sharedStateVariables.dashUsed) {
            this.sharedStateVariables.dashAvailable = true;
            this.sharedStateVariables.dashUsed = false;
        }
    }

    public async Enter(): Promise<void> {
        this.animation.Stop();
    }

    public async Exit(): Promise<void> {
        this.animation.Start();
    }

}
