import { Hero } from 'src/Hero';
import { DragonStateBase } from './DragonStateBase';
import { IState } from './IState';
import { SharedDragonStateVariables } from './SharedDragonStateVariables';
import { DragonEnemy } from '../DragonEnemy';
import { vec3 } from 'gl-matrix';
import { SoundEffect } from '../../../SoundEffect';
import { IProjectile } from '../../../Projectiles/IProjectile';
import { Fireball } from '../../../Projectiles/Fireball';

// TODO: 125 TODOs in 12/01 on boss_event branch
// TODO: reimplement as an internal state machine
enum State {
    REACH_ALTITUDE, // Start state
    SWEEPING,
    FLY_ATTACK,
    PRE_FLY_ATTACK,
}

export class FlyAttackState extends DragonStateBase implements IState {

    private state: State = State.REACH_ALTITUDE;
    private dir = vec3.fromValues(-0.01, 0, 0);
    private savedHeroPosition: vec3;
    private timeSignalingAttack = 0;
    private signaling = false;

    public constructor(hero: Hero,
                       dragon: DragonEnemy,
                       private attackSignal: SoundEffect,
                       private spawnProjectile: (sender: DragonEnemy, projectile: IProjectile) => void) {
        super(hero, dragon);
        this.savedHeroPosition = hero.CenterPosition;
    }

    public async Update(delta: number, shared: SharedDragonStateVariables): Promise<void> {
        // fly up
        if (this.state === State.REACH_ALTITUDE) {
            const destinationHeight = 6;
            const verticalDistance = destinationHeight - this.dragon.CenterPosition[1];
        
            if (verticalDistance < -0.01) {
                this.dragon.Move(vec3.fromValues(0, -0.01, 0), delta);
            } else {
                this.state = State.SWEEPING;
            }
        } else if (this.state === State.SWEEPING) {
            // left-right movement
            // change direction on collision
            if (this.dragon.WillCollide(this.dir, delta)) {
                this.dir = vec3.fromValues(this.dir[0] * -1, 0, 0);
            }
            this.dragon.Move(this.dir, delta);

            // TODO: spit fireballs while sweeping (only in phase 2?)
            //const
           // const fireball = Fireball.Create(this.dragon.FireBallProjectileSpawnPosition, )

            return; // TODO: delete when spit is implemented
            const randomTrigger = Math.random();
            if (randomTrigger < 0.01) {
                this.state = State.PRE_FLY_ATTACK;
            }
        } else if (this.state === State.PRE_FLY_ATTACK) {
            this.timeSignalingAttack += delta;
            if (!this.signaling) {
                this.dragon.SignalAttack(); // TODO: can be used in Enter() when the statemachine is implemented
                this.signaling = true;
            }

            // Wait a few frames after the signal before attacking
            // save hero position before attacking
            if (this.timeSignalingAttack > 10 / 60 * 1000) {
                this.savedHeroPosition = this.hero.CenterPosition;
                // move to fly attack
                this.signaling = false;
                this.timeSignalingAttack = 0;
                this.attackSignal.Play();
                this.state = State.FLY_ATTACK;
            }
        } else if (this.state === State.FLY_ATTACK) {
            // Diagonal attack from above
            // The attack itself is handled by the idle state
            // Move the dragon based on the position of the bite attack
            const attackDirection = vec3.sub(vec3.create(), this.savedHeroPosition, this.dragon.BiteProjectilePosition);
            attackDirection[2] = 0;
            vec3.normalize(attackDirection, attackDirection);
            vec3.scale(attackDirection, attackDirection, 0.025); // hard coded attack speed

            this.dragon.Move(attackDirection, delta);

            const distanceToRushPosition = vec3.distance(this.savedHeroPosition, this.dragon.CenterPosition);
            if (distanceToRushPosition < 2.0 || this.dragon.WillCollide(attackDirection, delta)) {
                this.dragon.ChangeState(this.dragon.IDLE_STATE());
                return;
            }
        }

        // TODO: fire breath from above attack? -- ez lehetne phase 2-ben
    }

    public Enter(): void { }

    public Exit(): void { }
    
}
