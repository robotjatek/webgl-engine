import { Hero } from './Hero';
import { PhysicsComponent } from '../Components/PhysicsComponent';
import { vec3 } from 'gl-matrix';

export class HeroMovementBehaviour {
    public constructor(private hero: Hero, private physicsComponent: PhysicsComponent) { }

    public MoveLeft(delta: number): void {
        this.physicsComponent.AddToExternalForce(vec3.scale(vec3.create(), vec3.fromValues(-this.hero.Speed, 0, 0), delta));
        this.hero.SetAnimationFrameset("left_walk");
        this.hero.FaceLeft();
    }

    public MoveRight(delta: number): void {
        this.physicsComponent.AddToExternalForce(vec3.scale(vec3.create(), vec3.fromValues(this.hero.Speed, 0, 0), delta));
        this.hero.SetAnimationFrameset("right_walk");
        this.hero.FaceRight();
    }
}
