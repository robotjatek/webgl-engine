import { vec2, vec3 } from 'gl-matrix';

export class BoundingBox {
  constructor(public position: vec3, public size: vec2) { 
  }
}
