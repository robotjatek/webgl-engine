import { vec2 } from "gl-matrix";

export class Sprite
{
    public Vertices: number[];
    public TextureCoordinates: number[];
    public textureOffset: vec2;

    public constructor(vertices: number[], textureCoordinates: number[])
    {
        this.Vertices = vertices;
        this.TextureCoordinates = textureCoordinates;
        this.textureOffset = vec2.create();
    }
}
