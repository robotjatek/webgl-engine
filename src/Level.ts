import { mat4 } from "gl-matrix";
import { Background } from "./Background";
import { Layer } from "./Layer";
import { Shader } from "./Shader";
import { SpriteBatch } from "./SpriteBatch";
import { TexturePool } from "./TexturePool";
import { Tile } from "./Tile";
import { Environment } from './Environment';
import { SoundEffectPool } from './SoundEffectPool';
import { SoundEffect } from './SoundEffect';
import { Texture } from './Texture';

// TODO: parallax scrolling
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
    private Background: SpriteBatch;
    private BackgroundViewMatrix = mat4.create();

    private constructor(private Layers: Layer[], bgShader: Shader, bgTexture: Texture, private music: SoundEffect) {
        this.Background = new SpriteBatch(bgShader, [new Background()], bgTexture);
    }

    public static async Create(): Promise<Level> {
        const texturePool = TexturePool.GetInstance();
        const groundTexture = await texturePool.GetTexture('textures/ground0.png');

        const tile = new Tile(21, 11, groundTexture);
        const tile2 = new Tile(22, 11, groundTexture);
        const tile3 = new Tile(23, 11, groundTexture);
        const tile4 = new Tile(18, 14, groundTexture);
        const tile5 = new Tile(19, 14, groundTexture);

        const tiles = [
            tile, tile2, tile3, tile4, tile5
        ];

        // Bottom tiles of the level
        for (let i = 0; i < 11; i++) {
            tiles.push(new Tile(i, Environment.VerticalTiles - 2, groundTexture));
        }
        for (let i = 14; i < 52; i++) {
            tiles.push(new Tile(i, Environment.VerticalTiles - 2, groundTexture));
        }
        for (let i = 55; i < 64; i++) {
            tiles.push(new Tile(i, Environment.VerticalTiles - 2, groundTexture));
        }


        for (let i = 0; i < 11; i++) {
            tiles.push(new Tile(i, Environment.VerticalTiles - 1, groundTexture));
        }
        for (let i = 14; i < 64; i++) {
            tiles.push(new Tile(i, Environment.VerticalTiles - 1, groundTexture));
        }

        const layers = [await Layer.Create(tiles)];
        const bgShader: Shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/FragmentShader.frag');
        const bgTexture = await TexturePool.GetInstance().GetTexture('textures/bg.jpg');
        const music = await SoundEffectPool.GetInstance().GetAudio('audio/level.mp3', false);

        return new Level(layers, bgShader, bgTexture, music);

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
