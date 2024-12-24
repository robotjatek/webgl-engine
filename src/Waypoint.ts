import { vec3 } from 'gl-matrix';

export class Waypoint {
    public constructor(public position: vec3, public next: Waypoint|null) { }
}
