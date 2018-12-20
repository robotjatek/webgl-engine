import { mat4 } from "gl-matrix";
import { Layer } from "./Layer";
import { TexturePool } from "./TexturePool";
import { Tile } from "./Tile";

/*
Level file format
Binary
----------------------------
Header:
0-2: "LVL"
3-4: Width (unsigned int)
5-6: Height (unsigned int)
7-8: Number of layers
----------------------------
Tile data 9-[Width*Height*Number_of_layers * 2]:
2 bytes of tile data. Indexes tile dictionary
----------------------------
Tile materials:
[Width*Height*Number_of_layers * 2 + 1]-End of file
{'texture path', opacity}
*/

export class Level
{
    private Layers: Layer[];

    public constructor(levelName: string)
    {
        const tile = new Tile(10, 11, TexturePool.GetInstance().GetTexture("ground0.png"));
        const tile2 = new Tile(12, 11, TexturePool.GetInstance().GetTexture("ground0.png"));
        this.Layers = [new Layer([tile, tile2])];
    }

    public Draw(projectionMatrix: mat4, viewMatrix: mat4): void
    {
        this.Layers.forEach((layer) => {
            layer.Draw(projectionMatrix, viewMatrix);
        });
    }
}
