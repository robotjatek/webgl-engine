import { vec3 } from 'gl-matrix';
import { IGameobject } from 'src/IGameobject';
import { IProjectileHitListener } from '../Level';

export interface IProjectile extends IGameobject {
    get AlreadyHit(): boolean;
    OnHit(): Promise<void>;
    SubscribeToHitEvent(onHitListener: IProjectileHitListener): void;
    get PushbackForce(): vec3;
}
