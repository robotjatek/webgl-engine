import { BoundingBox } from 'src/BoundingBox';
import { ICollider } from './ICollider';
import { mat4 } from "gl-matrix";
import { Shader } from "./Shader";
import { Sprite } from "./Sprite";
import { SpriteBatch } from "./SpriteBatch";
import { Texture } from "./Texture";
import { Tile } from "./Tile";
import { Utils } from "./Utils";
import { Environment } from './Environment';
import { IDisposable } from './IDisposable';

export class Layer implements ICollider, IDisposable {

    private constructor(private SpriteBatches: SpriteBatch[],
        private Tiles: Tile[]
    ) { }

    public static async Create(tiles: Tile[]): Promise<Layer> {
        const tileMap = Layer.CreateTileMap(tiles);
        const batches = await Layer.CreateSpriteBatches(tileMap);
        const layer = new Layer(batches, tiles);
        return layer;
    }

    public get BoundingBox(): BoundingBox {
        throw new Error('Method not implemented. Use IsColliding with instead');
    }

    public IsCollidingWith(boundingBox: BoundingBox, collideWithUndefined: boolean): boolean {
        // Outside of the boundaries are considered as collisions when collideWithUndefined is true.
        // This way a hero cant fall of the edge of the world.
        if (this.IsOutsideBoundary(boundingBox) && collideWithUndefined) {
            return true;
        }

        return this.Tiles.some(tiles => tiles.isCollindingWith(boundingBox));
    }

    public get MaxX(): number {
        return Math.max(...this.Tiles.map(t => t.PositionX), Environment.HorizontalTiles);
    }

    public get MinX(): number {
        return Math.min(...this.Tiles.map(t => t.PositionX));
    }

    public get MinY(): number {
        return Math.min(...this.Tiles.map(t => t.PositionY), 0);
    }

    public get MaxY(): number {
        return Math.max(...this.Tiles.map(t => t.PositionY), Environment.VerticalTiles);
    }

    public IsOutsideBoundary(boundingBox: BoundingBox): boolean {
        const minX = this.MinX;
        const maxX = this.MaxX;

        const bbMinX = boundingBox.position[0];
        const bbMaxX = boundingBox.position[0] + boundingBox.size[0];

        const inside = bbMinX > minX && bbMaxX < maxX;
        return !inside;
    }

    public IsUnder(boundingBox: BoundingBox): boolean {
        return this.MaxY < boundingBox.position[1];
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
    private static CreateTileMap(tiles: Tile[]): Map<Texture, Tile[]> {
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

    private static async CreateSpriteBatches(tileMap: Map<Texture, Tile[]>): Promise<SpriteBatch[]> {
        // TODO: do I really need a new shader PER BATCH?
        const tileShader = await Shader.Create("shaders/VertexShader.vert", "shaders/FragmentShader.frag");
        const batches: SpriteBatch[] = [];
        
        tileMap.forEach((tiles, texture) => {
            const sprites = tiles.map((t) => {
                const vertices = Utils.CreateSpriteVertices(t.PositionX, t.PositionY);
                return new Sprite(vertices, Utils.DefaultSpriteTextureCoordinates);
            });
            batches.push(new SpriteBatch(tileShader, sprites, texture));
        });

        return batches;
    }

    public Dispose(): void {
        this.SpriteBatches.forEach(s => s.Dispose());
    }
}
