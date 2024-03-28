import { mat4 } from "gl-matrix";
import { Shader } from "./Shader";
import { Sprite } from "./Sprite";
import { SpriteBatch } from "./SpriteBatch";
import { Texture } from "./Texture";
import { Tile } from "./Tile";
import { Utils } from "./Utils";
import { BoundingBox } from './BoundingBox';

export class Layer {
    private SpriteBatches: SpriteBatch[] = [];

    public constructor(private Tiles: Tile[]) {
        const tileMap = this.CreateTileMap(Tiles);
        this.CreateSpriteBatches(tileMap);
    }

    public isCollidingWith(boundingBox: BoundingBox): boolean {
        const collidingTiles = this.Tiles.filter((t) => {
            return t.isCollindingWith(boundingBox);
        });

        return collidingTiles.length > 0;
    }

    public Draw(projectionMatrix: mat4, viewMatrix: mat4): void {
        this.SpriteBatches.forEach(batch => batch.Draw(projectionMatrix, viewMatrix));
    }

    /**
     * Creates a texture based map of the tiles to help creating sprite batches.
     * Tiles with the same texture will be put in the same array
     * @param tiles The tile array to map
     * @returns The created tile map
     */
    private CreateTileMap(tiles: Tile[]): Map<Texture, Tile[]> {
        const tileMap = new Map<Texture, Tile[]>();
        tiles.forEach((tile) => {
            const tileBatch = tileMap.get(tile.Texture);
            if (!tileBatch) {
                tileMap.set(tile.Texture, [tile]);
            } else {
                tileBatch.push(tile);
            }
        });

        return tileMap;
    }

    private CreateSpriteBatches(tileMap: Map<Texture, Tile[]>) {
        const shader = new Shader("shaders/VertexShader.vert", "shaders/FragmentShader.frag");
        tileMap.forEach((tiles, texture) => {
            const sprites = tiles.map((t) => {
                const vertices = Utils.CreateSpriteVertices(t.PositionX, t.PositionY);
                return new Sprite(vertices, Utils.DefaultSpriteTextureCoordinates);
            });
            this.SpriteBatches.push(new SpriteBatch(shader, sprites, texture));
        });
    }
}
