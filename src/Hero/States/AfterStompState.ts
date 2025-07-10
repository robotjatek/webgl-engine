import { HeroBaseState } from './HeroBaseState';
import { Hero } from '../Hero';
import { IProjectile } from '../../Projectiles/IProjectile';
import { PhysicsComponent } from '../../Components/PhysicsComponent';
import { DamageComponent } from '../../Components/DamageComponent';
import { vec3 } from 'gl-matrix';
import { SharedHeroStateVariables } from './SharedHeroStateVariables';

export class AfterStompState extends HeroBaseState {

    public constructor(hero: Hero,
                       spawnProjectile: (sender: Hero, projectile: IProjectile) => void,
                       physicsComponent: PhysicsComponent,
                       damageComponent: DamageComponent,
                       sharedStateVariables: SharedHeroStateVariables
    ) {
        super(hero, physicsComponent, damageComponent, spawnProjectile, sharedStateVariables);
    }

    protected override async UpdateState(delta: number): Promise<void> {

        this.physicsComponent.AddToExternalForce(vec3.fromValues(0, -0.10, 0));
        await this.hero.ChangeState(this.hero.IDLE_STATE());
    }

    public async Enter(): Promise<void> {
        return Promise.resolve(undefined);
    }

    public async Exit(): Promise<void> {
        return Promise.resolve(undefined);
    }
}
