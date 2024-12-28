import { mat4, vec3 } from 'gl-matrix';
import { IGameobject } from 'src/IGameobject';
import { Level, IProjectileHitListener } from '../Level';
import { BoundingBox } from '../BoundingBox';
import { Hero } from '../Hero';

export interface IProjectile extends IGameobject {
    get AlreadyHit(): boolean;
    OnHit(): void;
    SubscribeToHitEvent(onHitListener: IProjectileHitListener): void;
    get PushbackForce(): vec3;
}
