import { vec3 } from 'gl-matrix';
import { Hero } from 'src/Hero';
import { BiteProjectile } from 'src/Projectiles/BiteProjectile';
import { IProjectile } from 'src/Projectiles/IProjectile';
import { SoundEffect } from 'src/SoundEffect';
import { DragonEnemy } from '../../DragonEnemy';
import { DragonStateBase } from '../DragonStateBase';
import { IState } from '../../../IState';
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
        const projectileCenter = this.dragon.FacingDirection[0] > 0 ?
            vec3.add(vec3.create(), this.dragon.CenterPosition, vec3.fromValues(-2.5, 1, 0)) :
            vec3.add(vec3.create(), this.dragon.CenterPosition, vec3.fromValues(2.5, 1, 0));
        const bite = await BiteProjectile.Create(projectileCenter, vec3.clone(this.dragon.FacingDirection));
        this.biteAttackSound.Play();
        this.spawnProjectile(this.dragon, bite);

        this.dragon.ChangeState(this.dragon.IDLE_STATE());
        this.shared.timeSinceLastAttack = 0;
        return;
    }

    public Enter(): void {
        // Do nothing
    }

    public Exit(): void {
        // Do nothing
    }
}
