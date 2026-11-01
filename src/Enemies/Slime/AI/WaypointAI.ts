import { ISlimeAI } from './ISlimeAI';
import { Waypoint } from '../../../Waypoint';
import { PhysicsComponent } from '../../../Components/PhysicsComponent';
import { vec3 } from 'gl-matrix';
import { SlimeEnemy } from '../SlimeEnemy';

/**
 * An AI that makes the slime move between its spawn position and another position with a constant offset.
 * Effectively making it a passive enemy.
 */
export class WaypointAI implements ISlimeAI {

    // A little variation in movement speed;
    private readonly minSpeed: number = 0.00004;
    private readonly maxSpeed: number = 0.00006;
    private movementSpeed: number = Math.random() * (this.maxSpeed - this.minSpeed) + this.minSpeed;
    private readonly offset: number = -6;
    private targetWaypoint: Waypoint;

    public constructor(private slime: SlimeEnemy,
                       private physicsComponent: PhysicsComponent) {
        // In passive mode slimes walk between their start position and another position with some constant offset
        const originalWaypoint = new Waypoint(vec3.clone(this.slime.Position), null);
        const targetPosition = vec3.add(vec3.create(), vec3.clone(this.slime.Position), vec3.fromValues(this.offset, 0, 0));
        this.targetWaypoint = new Waypoint(targetPosition, originalWaypoint);
        originalWaypoint.next = this.targetWaypoint;
    }

    public async Update(delta: number): Promise<void> {
        if (this.physicsComponent.OnGround) { // This way, the AI will not override velocity
            this.MoveTowardsNextWaypoint(delta);
        }
    }

    private MoveTowardsNextWaypoint(delta: number): void {
        const dir = vec3.sub(vec3.create(), this.slime.Position, this.targetWaypoint.position);
        if (dir[0] < 0) {
            this.slime.SetAnimationFrameset("right_walk");
            this.slime.Move(vec3.fromValues(this.movementSpeed, 0, 0), delta);
        } else {
            this.slime.SetAnimationFrameset("left_walk");
            this.slime.Move(vec3.fromValues(-this.movementSpeed, 0, 0), delta);
        }
        if (vec3.distance(this.slime.Position, this.targetWaypoint.position) < 0.025 && this.targetWaypoint.next) {
            this.targetWaypoint = this.targetWaypoint.next;
        }
    }
}
