import { vec2, vec3 } from 'gl-matrix';

// TODO: dynamic bb size for animated enemies
export class BoundingBox {
  constructor(public position: vec3, public size: vec2) {
  }

  public IsCollidingWith(otherBB: BoundingBox): boolean {
    const minX = this.position[0];
    const maxX = this.position[0] + this.size[0];
    const minY = this.position[1];
    const maxY = this.position[1] + this.size[1];

    const bbMinX = otherBB.position[0];
    const bbMaxX = otherBB.position[0] + otherBB.size[0];
    const bbMinY = otherBB.position[1];
    const bbMaxY = otherBB.position[1] + otherBB.size[1];

    return bbMinX < maxX && bbMaxX > minX &&
           bbMinY < maxY && bbMaxY > minY;
  }
}
