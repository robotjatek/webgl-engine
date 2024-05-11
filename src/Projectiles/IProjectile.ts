import { mat4, vec3 } from 'gl-matrix';
import { BoundingBox } from '../BoundingBox';
import { IDisposable } from '../IDisposable';

export interface IProjectile extends IDisposable {
    get AlreadyHit(): boolean;
    OnHit(): void; 
    get BoundingBox(): BoundingBox;
    Draw(proj: mat4, view: mat4): void;
    Update(delta: number): void;
    IsCollidingWith(boundingBox: BoundingBox): boolean;
    OnHitListeners: ((sender: IProjectile) => void)[]; // TODO: make this a SubscribeToHitEventMethod
    get PushbackForce(): vec3;
}
