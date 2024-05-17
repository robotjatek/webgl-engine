import { BoundingBox } from './BoundingBox';

export interface ICollider {
  get BoundingBox(): BoundingBox;
  /**
   * Determines if the implementing object is colliding with the given bounding box
   * @param boundingBox The bounding box to test against
   * @param collideWithUndefined Behaviour when testing against out of bounds.
   * Eg. a hero should collide with the edges of a layer, but projectiles and enemies should pass through.
   */
  IsCollidingWith(boundingBox: BoundingBox, collideWithUndefined: boolean): boolean;
}
