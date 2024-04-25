import { mat4 } from 'gl-matrix';
import { BoundingBox } from '../BoundingBox';
import { IDisposable } from '../IDisposable';


export interface IProjectile extends IDisposable {
    get AlreadyHit(): boolean;
    set AlreadyHit(value: boolean);
    get BoundingBox(): BoundingBox;
    Draw(proj: mat4, view: mat4): void;
    Update(delta: number): void;
    IsCollidingWith(boundingBox: BoundingBox): boolean;
    CallHitEventHandlers(): void;
}
