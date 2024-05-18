import { mat4, vec3 } from 'gl-matrix';
import { ICollider } from '../ICollider';
import { Hero } from '../Hero';
import { IDisposable } from 'src/IDisposable';

// TODO: IGameObject-s vs IEnemy-s -- Coin is not an enemy but an interactable entity

export interface IEnemy extends ICollider, IDisposable {
    Draw(proj: mat4, view: mat4): void;
    Update(delta: number): Promise<void>;
    Damage(pushbackForce: vec3): void;
    get Position(): vec3;
    Visit(hero: Hero): void;
}
