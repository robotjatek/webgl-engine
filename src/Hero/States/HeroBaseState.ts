import { IState } from '../../IState';
import { HeroMovementBehaviour } from '../HeroMovementBehaviour';
import { Hero } from '../../Hero';
import { PhysicsComponent } from '../../Components/PhysicsComponent';
import { DamageComponent } from '../../Components/DamageComponent';
import { IProjectile } from '../../Projectiles/IProjectile';
import { MeleeAttack } from '../../Projectiles/MeleeAttack';
import { vec3 } from 'gl-matrix';
import { SharedHeroStateVariables } from './SharedHeroStateVariables';

export abstract class HeroBaseState implements IState {

    protected movementBehaviour: HeroMovementBehaviour;

    protected constructor(protected hero: Hero,
                          protected physicsComponent: PhysicsComponent,
                          protected damageComponent: DamageComponent,
                          private SpawnProjectile: (sender: Hero, projectile: IProjectile) => void,
                          protected sharedStateVariables: SharedHeroStateVariables) {
        this.movementBehaviour = new HeroMovementBehaviour(hero, physicsComponent);
    }

    abstract Enter(): Promise<void>;

    abstract Exit(): Promise<void>;

    async Update(delta: number): Promise<void> {
        // Handle death
        if (this.hero.Health <= 0) {
            await this.hero.ChangeState(this.hero.DEAD_STATE());
        }

        await this.HandleInput();
        this.OverHealCountdown();
        this.sharedStateVariables.timeSinceLastMeleeAttack += delta;
        this.sharedStateVariables.timeInOverHeal += delta;
        this.sharedStateVariables.timeSinceLastDash += delta;
        this.sharedStateVariables.timeSinceLastStomp += delta;

        this.damageComponent.Update(delta);
        await this.UpdateState(delta);
    }

    /**
     * Internal update method for classes that implement {@link HeroBaseState}
     * @param delta elapsed time since last tick in ms
     */
    protected abstract UpdateState(delta: number): Promise<void>;

    private async HandleInput(): Promise<void> {
        if (this.hero.InputSource.Attack()) {
            const attackPosition = this.AttackSpawnPosition;
            if (this.sharedStateVariables.timeSinceLastMeleeAttack > 350) {
                this.sharedStateVariables.timeSinceLastMeleeAttack = 0;
                if (this.SpawnProjectile) {
                    // TODO: creating an attack instance on every attack is wasteful.
                    this.SpawnProjectile(this.hero, await MeleeAttack.Create(attackPosition, this.hero.FacingDirection));
                }
            }
        }
    }

    private get AttackSpawnPosition(): vec3 {
        return this.hero.FacingDirection[0] > 0 ?
            vec3.add(vec3.create(), this.hero.CenterPosition, vec3.fromValues(0, -1, 0)) :
            vec3.add(vec3.create(), this.hero.CenterPosition, vec3.fromValues(-4, -1, 0));
    }

    private OverHealCountdown() {
        if (this.hero.Health > 100) {
            if (this.sharedStateVariables.timeInOverHeal > 1000) {
                this.hero.Health--;
                this.sharedStateVariables.timeInOverHeal = 0;
            }
        }
    }

}
