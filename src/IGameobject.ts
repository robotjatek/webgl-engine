import { mat4 } from 'gl-matrix';
import { ICollider } from './ICollider';
import { Hero } from './Hero';
import { IDisposable } from 'src/IDisposable';
import { IProjectile } from './Projectiles/IProjectile';


export interface IGameobject extends ICollider, IDisposable {
  Draw(proj: mat4, view: mat4): void;
  Update(delta: number): Promise<void>;
  Visit(hero: Hero): Promise<void>;
  /**
   * Is the object considered an end condition. All end conditions must be despawned before leaving the level.
   */
  get EndCondition(): boolean; // TODO: projectiles are gameobjects but far from end conditions. I may need to rewise the inheritance tree...
  CollideWithAttack(attack: IProjectile): Promise<void>;
}
