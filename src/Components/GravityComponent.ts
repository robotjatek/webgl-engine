
import { vec3 } from 'gl-matrix';

// Apply gravity to velocity
export class GravityComponent {

    private readonly GRAVITY = vec3.fromValues(0, 0.00004, 0);

    public constructor(private velocity: vec3) {
    }

    public Update(delta: number): void {
        this.ApplyGravityToVelocity(delta);
    }

    private ApplyGravityToVelocity(delta: number): void {
        vec3.add(this.velocity, this.velocity, vec3.scale(vec3.create(), this.GRAVITY, delta));
    }
}
