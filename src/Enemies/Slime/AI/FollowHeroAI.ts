import { ISlimeAI } from './ISlimeAI';
import { PhysicsComponent } from '../../../Components/PhysicsComponent';
import { Hero } from '../../../Hero/Hero';
import { vec3 } from 'gl-matrix';
import { SlimeEnemy } from '../SlimeEnemy';

/**
 * AI that follows the hero, used in aggressive slimes
 */
export class FollowHeroAI implements ISlimeAI {

    // A little variation in movement speed;
    readonly minSpeed: number = 0.00006;
    readonly maxSpeed: number = 0.0001;
    private movementSpeed: number = Math.random() * (this.maxSpeed - this.minSpeed) + this.minSpeed;

    public constructor(private slime: SlimeEnemy, private physicsComponent: PhysicsComponent, private hero: Hero) {
    }

    public async Update(delta: number): Promise<void> {
        if (this.physicsComponent.OnGround) { // This way, the AI will not override velocity
            const dir = vec3.sub(vec3.create(), this.hero.Position, this.slime.Position);
            if (dir[0] > 0) {
                this.slime.SetAnimationFrameset("right_walk");
                this.slime.Move(vec3.fromValues(this.movementSpeed, 0, 0), delta);
            } else {
                this.slime.SetAnimationFrameset("left_walk");
                this.slime.Move(vec3.fromValues(-this.movementSpeed, 0, 0), delta);
            }
        }
    }
}
