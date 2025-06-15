import { ICollider } from '../ICollider';
import { vec3 } from 'gl-matrix';
import { BoundingBox } from '../BoundingBox';

// Applies velocity to position
export class MovementComponent {

    public constructor(private collider: ICollider,
                       private position: vec3,
                       private lastPosition: vec3,
                       private velocity: vec3,
                       private bbOffset: vec3,
                       private boundingBox: BoundingBox) {
    }

    public Update(delta: number): void {
        vec3.copy(this.lastPosition, this.position);
        const nextPosition = this.CalculateNextPosition(this.velocity, delta);
        if (!this.CheckCollisionWithCollider(nextPosition, this.boundingBox)) {
            vec3.copy(this.position, nextPosition);
        } else {
            this.velocity[0] = 0;
            this.velocity[1] = 0;
            // TODO: onground true
        }
    }

    /**
     * Check if movement to the direction would cause a collision
     */
    public WillCollide(direction: vec3, delta: number): boolean {
        //return false;
        return this.CheckCollisionWithCollider(this.CalculateNextPosition(direction, delta), this.boundingBox);
    }

    private CheckCollisionWithCollider(nextPosition: vec3, boundingBox: BoundingBox): boolean {
        const nextBbPos = vec3.add(vec3.create(), nextPosition, this.bbOffset);
        const nextBoundingBox = new BoundingBox(nextBbPos, boundingBox.size);
        return this.collider.IsCollidingWith(nextBoundingBox, true);
    }

    private CalculateNextPosition(velocity: vec3, delta: number): vec3 {
        return vec3.scaleAndAdd(vec3.create(), this.position, velocity, delta);
    }
}
