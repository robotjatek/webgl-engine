import { BoundingBox } from './BoundingBox';

export interface ICollider {
  IsCollidingWidth(boundingBox: BoundingBox): boolean;
}
