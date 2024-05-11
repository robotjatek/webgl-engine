import { mat4 } from 'gl-matrix';
import { ICollider } from '../ICollider';
import { Hero } from '../Hero';


export interface IPickup extends ICollider {
  // TODO: IProjectile and IEnemy also have Draw & Update methods => maybe these are more generic "IGameobject"-s?
  Draw(proj: mat4, view: mat4): void;
  Update(delta: number): Promise<void>;
  Visit(hero: Hero): void;
  get EndCondition(): boolean;
}
