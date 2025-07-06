import { vec3 } from 'gl-matrix';
import { Hero } from 'src/Hero';
import { BiteProjectile } from 'src/Projectiles/BiteProjectile';
import { IProjectile } from 'src/Projectiles/IProjectile';
import { SoundEffect } from 'src/SoundEffect';
import { DragonEnemy } from '../../DragonEnemy';
import { DragonStateBase } from '../DragonStateBase';
import { IState } from '../../../../IState';
import { SharedDragonStateVariables } from '../SharedDragonStateVariables';
import { RushState } from './RushState';

export class AttackState extends DragonStateBase implements IState {

    public constructor(hero: Hero, dragon: DragonEnemy,
                       private context: RushState,
                       private biteAttackSound: SoundEffect,
                       private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void,
                       private shared: SharedDragonStateVariables) {
        super(hero, dragon);
    }

    public override async Update(delta: number): Promise<void> {
        // Spawn a bite projectile
        // This is handled differently from the normal attack, when the hero remains close
        this.dragon.ResetVelocity();
        const projectilePosition = this.dragon.BiteProjectilePosition;
        const bite = await BiteProjectile.Create(projectilePosition, vec3.clone(this.dragon.FacingDirection));
        await this.biteAttackSound.Play();
        this.spawnProjectile(this.dragon, bite);

        await this.dragon.ChangeState(this.dragon.IDLE_STATE());
        this.shared.timeSinceLastAttack = 0;
        return;
    }

    public async Enter(): Promise<void> {
        // Do nothing
    }

    public async Exit(): Promise<void> {
        // Do nothing
    }
}
