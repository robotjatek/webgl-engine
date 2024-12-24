export class Sprite
{
    public Vertices: number[];
    public TextureCoordinates: number[];

    public constructor(vertices: number[], textureCoordinates: number[])
    {
        this.Vertices = vertices;
        this.TextureCoordinates = textureCoordinates;
    }
}
