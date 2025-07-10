import { vec3 } from 'gl-matrix';
import { BoundingBox } from '../BoundingBox';
import { ICollider } from '../ICollider';

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

    public Update(delta: number): void {
        vec3.copy(this.lastPosition, this.position);

        this.xCollide = false;
        this.yCollide = false;

        if (!this.flying && this.gravityEnabled) {
            this.ApplyGravityToVelocity(delta);
        }

        this.ApplyDamping();
        this.ApplyExternalForceToVelocity();

        const boundingBox = this.boundingBox();

        const nextX = this.CalculateNextPosition(vec3.fromValues(this.velocity[0], 0, 0), delta);
        const bbPosX = vec3.add(vec3.create(), nextX, this.bbOffset);
        const bbX = new BoundingBox(bbPosX, boundingBox.size);

        if (this.collider.IsCollidingWith(bbX, !this.canGoOutOfBounds)) {
            this.velocity[0] = 0;
            this.xCollide = true;
        } else {
            this.position[0] = nextX[0];
        }

        const nextY = this.CalculateNextPosition(vec3.fromValues(0, this.velocity[1], 0), delta);
        const bbPosY = vec3.add(vec3.create(), vec3.fromValues(this.position[0], nextY[1], this.position[2]), this.bbOffset);
        const bbY = new BoundingBox(bbPosY, boundingBox.size);

        if (this.collider.IsCollidingWith(bbY, !this.canGoOutOfBounds)) {
            const movingDownward = this.velocity[1] > 0;
            const stopped = Math.abs(this.velocity[1]) < 0.00001;

            this.velocity[1] = 0;
            this.yCollide = true;
            this.onGround = movingDownward || stopped;
        } else {
            this.position[1] = nextY[1];
            this.onGround = false;
        }

        vec3.set(this.externalForce, 0, 0, 0);
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
