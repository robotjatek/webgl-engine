import { mat4, vec3 } from 'gl-matrix';
import { ICollider } from '../ICollider';
import { Hero } from '../Hero';

// TODO: extend IDisposable
// TODO: IGameObject-s vs IEnemy-s -- Coin is not an enemy but an interactable entity

export interface IEnemy extends ICollider {
    Draw(proj: mat4, view: mat4): void;
    Update(delta: number): void;
    Damage(pushbackForce: vec3): void;
    get Position(): vec3;
    Visit(hero: Hero): void;
}
