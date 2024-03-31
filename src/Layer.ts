import { ICollider } from './ICollider';
import { mat4 } from "gl-matrix";
import { Shader } from "./Shader";
import { Sprite } from "./Sprite";
import { SpriteBatch } from "./SpriteBatch";
import { Texture } from "./Texture";
import { Tile } from "./Tile";
import { Utils } from "./Utils";
import { BoundingBox } from './BoundingBox';

export class Layer implements ICollider {
    private SpriteBatches: SpriteBatch[] = [];

    public constructor(private Tiles: Tile[]) {
        const tileMap = this.CreateTileMap(Tiles);
        this.CreateSpriteBatches(tileMap);
    }

    IsCollidingWidth(boundingBox: BoundingBox): boolean {
        // Outside of the boundaries are considered as collisions. This way a hero cant fall of the edge of the world
        if (this.IsOutsideBoundary(boundingBox)) {
            return true;
        }

        const collidingTiles = this.Tiles.filter((t) => {
            return t.isCollindingWith(boundingBox);
        });

        return collidingTiles.length > 0;
    }

    public get MaxX(): number {
        return Math.max(...this.Tiles.map(t => t.PositionX));
    }

    public get MinX(): number {
        return Math.min(...this.Tiles.map(t => t.PositionX));
    }

    public IsOutsideBoundary(boundingBox: BoundingBox) {
        const minX = this.MinX + 1;
        const maxX = this.MaxX - 1;
        const bbMinX = boundingBox.position[0];
        const bbMaxX = boundingBox.position[0] + boundingBox.size[0];

        const isInsideBoundary = bbMinX < maxX && bbMaxX > minX
        return !isInsideBoundary;
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
