import { mat4 } from "gl-matrix";
import { Shader } from "./Shader";
import { Sprite } from "./Sprite";
import { SpriteBatch } from "./SpriteBatch";
import { Texture } from "./Texture";
import { Tile } from "./Tile";
import { Utils } from "./Utils";

export class Layer
{
    private TileMap = new Map<Texture, Tile[]>();
    private SpriteBatches: SpriteBatch[];

    public constructor(Tiles: Tile[])
    {
        this.SpriteBatches = [];
        this.CreateTileMap(Tiles);
        this.CreateSpriteBatches();
    }

    public Draw(projectionMatrix: mat4, viewMatrix: mat4): void
    {
        this.SpriteBatches.forEach((batch) => {
            batch.Draw(projectionMatrix, viewMatrix);
        });
    }

    private CreateTileMap(Tiles: Tile[]): void {
        Tiles.forEach((tile) => {
            const tileBatch = this.TileMap.get(tile.Texture);
            if (!tileBatch) {
                this.TileMap.set(tile.Texture, [tile]);
            } else
            {
                tileBatch.push(tile);
            }
        });
    }

    private CreateSpriteBatches() {
        const shader = new Shader("shaders/VertexShader.vert", "shaders/FragmentShader.frag");
        this.TileMap.forEach((tiles, texture) => {
            const sprites = tiles.map((t) => {
                const vertices = Utils.CreateSpriteVertices(t.PositionX, t.PositionY);
                return new Sprite(vertices, Utils.DefaultSpriteTextureCoordinates);
            });
            this.SpriteBatches.push(new SpriteBatch(shader, sprites, texture));
        });
    }
}
