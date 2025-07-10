import { mat4, vec2, vec3 } from "gl-matrix";
import { Hero } from '../Hero/Hero';
import { Level } from '../Level';
import { BoundingBox } from '../BoundingBox';
import { IProjectile } from '../Projectiles/IProjectile';
import { IGameobject } from '../IGameobject';

/**
 * Changes the current global level event upon contact
 */
export class LevelEventTrigger implements IGameobject {
    constructor(private level: Level, private position: vec3, private eventName: string) {
    }

    public Draw(proj: mat4, view: mat4): void {
        // Invisible
    }

    public Update(delta: number): Promise<void> {
        return Promise.resolve();
    }

    public async Visit(hero: Hero): Promise<void> {
        this.level.ChangeEvent(this.eventName);
    }

    public get EndCondition(): boolean {
        return false;
    }

    public async CollideWithAttack(attack: IProjectile): Promise<void> {
        // invisible & invincible
    }

    public get BoundingBox(): BoundingBox {
        return new BoundingBox(this.position, vec2.fromValues(1, 1));
    }

    public IsCollidingWith(boundingBox: BoundingBox, _: boolean): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public Dispose(): void {
        // Nothing to dispose ATM
    }
}
