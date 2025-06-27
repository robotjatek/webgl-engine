import { vec3 } from 'gl-matrix';
import { BoundingBox } from '../BoundingBox';
import { ICollider } from '../ICollider';

// TODO: too fast movement can cause collision issues, needs to be fixed
export class PhysicsComponent {

    private gravityEnabled = true;
    private readonly GRAVITY = vec3.fromValues(0, 0.00023, 0);
    private velocity : vec3  = vec3.create();
    private externalForce : vec3 = vec3.create();
    private onGround : boolean = false;
    private xCollide = false;
    private yCollide = false;

    public constructor(private position: vec3,
                       private lastPosition : vec3,
                       private boundingBox: () => BoundingBox,
                       private bbOffset: vec3,
                       private collider: ICollider,
                       private flying: boolean,
                       private canGoOutOfBounds: boolean = false) {
    }

    public Update(delta: number) : void {
        this.xCollide = false;
        this.yCollide = false;

        if (!this.flying && this.gravityEnabled) {
            this.ApplyGravityToVelocity(delta);
        }
        this.ApplyDamping();
        this.ApplyExternalForceToVelocity();

        const tmpVelocity = vec3.clone(this.velocity);

        const nextX = this.CalculateNextPosition(vec3.fromValues(tmpVelocity[0], 0, 0), delta);
        if (this.CheckCollisionWithCollider(nextX, this.boundingBox(), this.bbOffset)) {
            this.velocity[0] = 0;
            tmpVelocity[0] = 0;
            this.xCollide = true;
        }

        const nextY = this.CalculateNextPosition(vec3.fromValues(0, tmpVelocity[1], 0), delta);
        if (this.CheckCollisionWithCollider(nextY, this.boundingBox(), this.bbOffset)) {
            // Only set onGround if we're moving downward or stopped
            const movingDownward = this.velocity[1] > 0;
            const stopped = Math.abs(this.velocity[1]) < 0.00001;

            this.velocity[1] = 0;
            tmpVelocity[1] = 0;
            this.onGround = movingDownward || stopped;
            this.yCollide = true;
        } else {
            this.onGround = false;
        }

        vec3.copy(this.lastPosition, this.position);
        vec3.copy(this.position, this.CalculateNextPosition(tmpVelocity, delta));
        this.externalForce = vec3.create();
    }

    public get OnGround(): boolean {
        return this.onGround;
    }

    public get Colliding(): boolean {
        return this.xCollide || this.yCollide;
    }

    public get Velocity(): vec3 {
        return this.velocity;
    }

    public DisableGravity(): void {
        this.gravityEnabled = false;
    }

    public EnableGravity(): void {
        this.gravityEnabled = true;
    }

    public AddToExternalForce(force: vec3) {
        vec3.add(this.externalForce, this.externalForce, force);
    }

    public WillCollide(delta: number): boolean {
        const nextX = this.CalculateNextPosition(vec3.fromValues(this.velocity[0], 0, 0), delta);
        const nextY = this.CalculateNextPosition(vec3.fromValues(0, this.velocity[1], 0), delta);

        return this.CheckCollisionWithCollider(nextX, this.boundingBox(), this.bbOffset) ||
            this.CheckCollisionWithCollider(nextY, this.boundingBox(), this.bbOffset);
    }

    public ResetVelocity() : void {
        vec3.set(this.velocity, 0, 0, 0);
        this.externalForce = vec3.create();
    }

    public ResetVerticalVelocity() : void {
        this.velocity[1] = 0;
        this.externalForce[1] = 0;
    }

    private ApplyExternalForceToVelocity() {
        vec3.add(this.velocity, this.velocity, this.externalForce);
    }

    private ApplyGravityToVelocity(delta: number) : void {
        vec3.add(this.velocity, this.velocity, vec3.scale(vec3.create(), this.GRAVITY, delta));
    }

    private CalculateNextPosition(velocity: vec3, delta: number): vec3 {
        return vec3.scaleAndAdd(vec3.create(), this.position, velocity, delta);
    }

    private CheckCollisionWithCollider(nextPosition: vec3, boundingBox: BoundingBox, bbOffset: vec3): boolean {
        const nextBbPos = vec3.add(vec3.create(), nextPosition, bbOffset);
        const nextBoundingBox = new BoundingBox(nextBbPos, boundingBox.size);
        return this.collider.IsCollidingWith(nextBoundingBox, !this.canGoOutOfBounds);
    }

    private ApplyDamping() : void {
        const groundDamping = 0.75;
        const airDamping = 0.9;
        const nonFlyingAirDamping = 0.75;
        // flying enemies only affected by air damping
        const damping = this.flying ? airDamping :
            this.onGround ? groundDamping : nonFlyingAirDamping;

        vec3.scale(this.velocity, this.velocity, damping);

        if (Math.abs(this.velocity[0]) < 0.00001) {
            this.velocity[0] = 0;
        }
        if (Math.abs(this.velocity[1]) < 0.00001) {
            this.velocity[1] = 0;
        }
    }
}
