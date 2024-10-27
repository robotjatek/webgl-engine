import { vec3 } from 'gl-matrix';
import { Hero } from 'src/Hero';
import { BiteProjectile } from 'src/Projectiles/BiteProjectile';
import { IProjectile } from 'src/Projectiles/IProjectile';
import { SoundEffect } from 'src/SoundEffect';
import { DragonEnemy } from '../DragonEnemy';
import { IState } from './IState';
import { SharedDragonStateVariables } from './SharedDragonStateVariables';
import { DragonStateBase } from './DragonStateBase';

// TODO: reimplement as an internal state machine
export enum InternalRushState {
    START = 'start',
    BACKING = 'backing',
    CHARGE = 'charge',
    PRE_ATTACK = 'pre-attack',
    ATTACK = 'attack'
}

export class RushState extends DragonStateBase implements IState {

    private timeInBacking = 0;
    private timeInCharge = 0;
    private timeinPreAttack = 0;


    // TODO: internal states for RushState
    private rushState: InternalRushState = InternalRushState.START;

    public constructor(
        hero: Hero,
        dragon: DragonEnemy,
        private rushSound: SoundEffect,
        private backingStartSound: SoundEffect,
        private biteAttackSound: SoundEffect,
        private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void
    ) {
        super(hero, dragon);
     }

    public async Update(delta: number, shared: SharedDragonStateVariables): Promise<void> {
        if (this.rushState === InternalRushState.START) {
            this.timeInBacking = 0;
            this.rushState = InternalRushState.BACKING;
            this.backingStartSound.Play(1.0, 0.3);
        } else if (this.rushState === InternalRushState.BACKING) {
            this.timeInBacking += delta;
            const dir = vec3.sub(vec3.create(), this.dragon.CenterPosition, this.hero.CenterPosition);
            if (dir[0] > 0) {
                this.dragon.MoveOnX(0.0035, delta);
            } else if (dir[0] < 0) {
                this.dragon.MoveOnX(-0.0035, delta);
            }

            if (this.timeInBacking > 3000 || (vec3.distance(this.dragon.CenterPosition, this.hero.CenterPosition) > 15 && this.timeInBacking > 1000)) {
                this.timeInBacking = 0;
                this.rushState = InternalRushState.CHARGE;
                this.rushSound.Play();
            }
        } else if (this.rushState === InternalRushState.CHARGE) {
            this.timeInCharge += delta;
            shared.timeSinceLastAttack = 0; //TODO: ???
            shared.timeSinceLastCharge = 0;
            const dir = vec3.sub(vec3.create(), this.dragon.CenterPosition, this.hero.CenterPosition);
            if (dir[0] > 0) {
                this.dragon.MoveOnX(-0.035, delta);
            } else if (dir[0] < 0) {
                this.dragon.MoveOnX(0.035, delta);
            }

            // Move out of charge state when distance on the Y axis is close enough
            const distanceOnX = Math.abs(this.dragon.CenterPosition[0] - this.hero.CenterPosition[0]);
            if (distanceOnX < 3) {
                this.rushState = InternalRushState.PRE_ATTACK;
                this.timeInCharge = 0;
            }
        } else if (this.rushState === InternalRushState.PRE_ATTACK) {
            // The charge is completed but we wait a couple of frames before executing an attack
            this.timeinPreAttack += delta;

            if (this.timeinPreAttack > 96) {
                this.timeinPreAttack = 0;
                this.rushState = InternalRushState.ATTACK;
            }
        } else if (this.rushState === InternalRushState.ATTACK) {
            // Spawn a bite projectile
            // This is handled differently from the normal attack, when the hero remains close
            const projectileCenter = this.dragon.FacingDirection[0] > 0 ?
                vec3.add(vec3.create(), this.dragon.CenterPosition, vec3.fromValues(-2.5, 1, 0)) :
                vec3.add(vec3.create(), this.dragon.CenterPosition, vec3.fromValues(2.5, 1, 0));
            const bite = await BiteProjectile.Create(projectileCenter, vec3.clone(this.dragon.FacingDirection));
            this.biteAttackSound.Play();
            this.spawnProjectile(this.dragon, bite);

            this.dragon.ChangeState(this.dragon.IDLE_STATE());
            shared.timeSinceLastAttack = 0; // TODO: ?

            return;
        }

        if (this.rushState !== InternalRushState.CHARGE)
            super.MatchHeroHeight(delta);
    }
}
