import { mat4 } from 'gl-matrix';
import { ICollider } from './ICollider';
import { Hero } from './Hero';
import { IDisposable } from 'src/IDisposable';
import { IProjectile } from './Projectiles/IProjectile';


export interface IGameobject extends ICollider, IDisposable {
  Draw(proj: mat4, view: mat4): void;
  Update(delta: number): Promise<void>;
  Visit(hero: Hero): void;
  get EndCondition(): boolean; // TODO: projectiles are gameobjects but far from end conditions. I may need to rewise the inheritance tree...
  CollideWithAttack(attack: IProjectile): void; // TODO: maybe IGameObject in the future
}
