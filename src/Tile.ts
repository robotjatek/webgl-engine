import { Texture } from "./Texture";

export class Tile
{
    private positionX: number;
    private positionY: number;
    private texture: Texture;

    public constructor(positionX: number, positionY: number, texture: Texture)
    {
        this.positionX = positionX;
        this.positionY = positionY;
        this.texture = texture;
    }

    get Texture(): Texture
    {
        return this.texture;
    }

    get PositionX(): number
    {
        return this.positionX;
    }

    get PositionY(): number
    {
        return this.positionY;
    }
}
