import { mat4 } from "gl-matrix";
import { Background } from "./Background";
import { Layer } from "./Layer";
import { Shader } from "./Shader";
import { SpriteBatch } from "./SpriteBatch";
import { TexturePool } from "./TexturePool";
import { Tile } from "./Tile";
import { Environment } from './Environment';
import { BoundingBox } from './BoundingBox';
import { SoundEffectPool } from './SoundEffectPool';

/*
TODO:
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

export class Level {
    private Layers: Layer[];
    private Background: SpriteBatch;
    private BackgroundViewMatrix = mat4.create();
    private music = SoundEffectPool.GetInstance().GetAudio('audio/level.mp3', false);

    public constructor(levelName: string) {
        const texturePool = TexturePool.GetInstance();

        const tile = new Tile(10, 11, texturePool.GetTexture("ground0.png"));
        const tile2 = new Tile(12, 11, texturePool.GetTexture("ground0.png"));
        const tile3 = new Tile(13, 11, texturePool.GetTexture("ground0.png"));
        const tile4 = new Tile(5, 14, texturePool.GetTexture("ground0.png"));
        const tile5 = new Tile(6, 14, texturePool.GetTexture("ground0.png"));

        const tiles = [tile, tile2, tile3, tile4, tile5];

        // Bottom tiles of the level
        for (let j = Environment.VerticalTiles - 2; j < Environment.VerticalTiles; j++) {
            for (let i = 0; i < 64; i++) {
                tiles.push(new Tile(i, j, texturePool.GetTexture("ground0.png")))
            }
        }
        this.Layers = [new Layer(tiles)];

        const shader = new Shader("shaders/VertexShader.vert", "shaders/FragmentShader.frag");
        this.Background = new SpriteBatch(shader, [new Background()], texturePool.GetTexture("bg.jpg"));
    }

    public Draw(projectionMatrix: mat4, viewMatrix: mat4): void {
        this.Background.Draw(projectionMatrix, this.BackgroundViewMatrix);
        this.Layers.forEach((layer) => {
            layer.Draw(projectionMatrix, viewMatrix);
        });
    }

    public get MainLayer(): Layer {
        return this.Layers[0];
    }

    public PlayMusic(volume: number): void {
        this.music.Play(1, volume, null, true);
    }

    public SetMusicVolume(volume: number): void {
        this.music.SetVolume(volume);
    }
}
