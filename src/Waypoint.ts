import { vec3 } from 'gl-matrix';

export class Waypoint {
    public next: Waypoint;

    public constructor(public position: vec3) { }
}
