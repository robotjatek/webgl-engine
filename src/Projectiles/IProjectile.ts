import { vec3 } from 'gl-matrix';
import { IGameobject } from 'src/Pickups/IPickup';

export interface IProjectile extends IGameobject {
    get AlreadyHit(): boolean;
    OnHit(): void; 
    OnHitListeners: ((sender: IProjectile) => void)[]; // TODO: make this a SubscribeToHitEventMethod
    get PushbackForce(): vec3;
}
