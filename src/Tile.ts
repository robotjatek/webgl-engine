import { vec3 } from 'gl-matrix';
import { Texture } from "./Texture";
import { BoundingBox } from './BoundingBox';

export class Tile {
    private positionX: number; // TODO: position vector instead of primitives
    private positionY: number;
    private texture: Texture;

    public constructor(positionX: number, positionY: number, texture: Texture) {
        this.positionX = positionX;
        this.positionY = positionY;
        this.texture = texture;
    }

    get Texture(): Texture {
        return this.texture;
    }

    get PositionX(): number {
        return this.positionX;
    }

    get PositionY(): number {
        return this.positionY;
    }

    public isPointInside(point: vec3): boolean {
        // A tile is always 1x1
        const minX = this.positionX;
        const maxX = this.positionX + 1;
        const minY = this.positionY;
        const maxY = this.positionY + 1;

        return point[0] >= minX && point[0] <= maxX &&
            point[1] >= minY && point[1] <= maxY;
    }

    public isCollindingWith(boundingBox: BoundingBox) {
        // A tile is always 1x1
        const minX = this.positionX;
        const maxX = this.positionX + 1;
        const minY = this.positionY;
        const maxY = this.positionY + 1;

        const bbMinX = boundingBox.BottomLeft[0];
        const bbMaxX = boundingBox.BottomRight[0];
        const bbMinY = boundingBox.TopLeft[1];
        const bbMaxY = boundingBox.TopRight[1];

        return bbMinX <= maxX && bbMaxX >= minX &&
            bbMinY <= maxY && bbMaxY >= minY;
    }
}
