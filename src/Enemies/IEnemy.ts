import { vec3 } from 'gl-matrix';
import { ICollider } from '../ICollider';
import { IDisposable } from 'src/IDisposable';
import { IGameobject } from 'src/IGameobject';

export interface IEnemy extends ICollider, IDisposable, IGameobject {
    Damage(pushbackForce: vec3): void;
    get Position(): vec3;
    get Health(): number;
}
