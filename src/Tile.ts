import { vec3 } from 'gl-matrix';
import { Texture } from "./Texture";
import { BoundingBox } from './BoundingBox';

export class Tile {
    private collidable: boolean = true;

    // TODO: position vector instead of primitives
    public constructor(private readonly positionX: number,
                       private readonly positionY: number,
                       private readonly texture: Texture | null) {
        this.positionX = positionX;
        this.positionY = positionY;
        this.texture = texture;
    }

    get Texture(): Texture | null {
        return this.texture;
    }

    get PositionX(): number {
        return this.positionX;
    }

    get PositionY(): number {
        return this.positionY;
    }

    public get Collidable(): boolean {
        return this.collidable;
    }

    public set Collidable(value: boolean) {
        this.collidable = value;
    }

    public IsPointInside(point: vec3, offsetX: number, offsetY: number): boolean {
        // A tile is always 1x1
        const minX = this.positionX + offsetX;
        const maxX = this.positionX + offsetX + 1;
        const minY = this.positionY + offsetY;
        const maxY = this.positionY + offsetY +1;

        return point[0] >= minX && point[0] <= maxX &&
            point[1] >= minY && point[1] <= maxY;
    }

    public IsCollidingWith(boundingBox: BoundingBox, offsetX: number, offsetY: number) {
        if (!this.collidable) {
            return false;
        }

        // A tile is always 1x1
        const minX = this.positionX + offsetX;
        const maxX = this.positionX + offsetX + 1;
        const minY = this.positionY + offsetY;
        const maxY = this.positionY + offsetY + 1;

        const bbMinX = boundingBox.position[0];
        const bbMaxX = boundingBox.position[0] + boundingBox.size[0];
        const bbMinY = boundingBox.position[1];
        const bbMaxY = boundingBox.position[1] + boundingBox.size[1];

        return bbMinX < maxX && bbMaxX > minX &&
            bbMinY < maxY && bbMaxY > minY;
    }
}
