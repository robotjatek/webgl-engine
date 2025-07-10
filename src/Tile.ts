import { vec2, vec3 } from 'gl-matrix';
import { Texture } from "./Texture";
import { BoundingBox } from './BoundingBox';

export class Tile {
    private collidable: boolean = true;

    public constructor(private readonly position: vec2,
                       private readonly texture: Texture | null) {
        this.texture = texture;
    }

    get Texture(): Texture | null {
        return this.texture;
    }

    public get Position(): vec2 {
        return this.position;
    }

    public get Collidable(): boolean {
        return this.collidable;
    }

    public set Collidable(value: boolean) {
        this.collidable = value;
    }

    public IsPointInside(point: vec3, offset: vec2): boolean {
        // A tile is always 1x1
        const minX = this.position[0] + offset[0];
        const maxX = this.position[0] + offset[0] + 1;
        const minY = this.position[1] + offset[1];
        const maxY = this.position[1] + offset[1] + 1;

        return point[0] >= minX && point[0] <= maxX &&
            point[1] >= minY && point[1] <= maxY;
    }

    public IsCollidingWith(boundingBox: BoundingBox, offsetX: number, offsetY: number) {
        if (!this.collidable) {
            return false;
        }

        // A tile is always 1x1
        const minX = this.position[0] + offsetX;
        const maxX = this.position[0] + offsetX + 1;
        const minY = this.position[1] + offsetY;
        const maxY = this.position[1] + offsetY + 1;

        const bbMinX = boundingBox.position[0];
        const bbMaxX = boundingBox.position[0] + boundingBox.size[0];
        const bbMinY = boundingBox.position[1];
        const bbMaxY = boundingBox.position[1] + boundingBox.size[1];

        return bbMinX < maxX && bbMaxX > minX &&
            bbMinY < maxY && bbMaxY > minY;
    }
}
