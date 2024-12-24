import { mat4, vec2 } from 'gl-matrix';
import { Shader } from './Shader';
import { Texture } from './Texture';
import { TexturePool } from './TexturePool';
import { Utils } from './Utils';
import { Sprite } from './Sprite';
import { SpriteBatch } from './SpriteBatch';
import { gl } from './WebGLUtils';
import { IDisposable } from './IDisposable';
import { FontConfigPool } from './FontConfigPool';

type CharProperties = {
    x: number;
    y: number;
    width: number;
    height: number;
    originX: number;
    originY: number;
    advance: number;
}

export class FontConfig {
    private constructor(public characters: Map<string, CharProperties>) { }

    public static async Create(fontPath: string) {
        const jsonString = await (await fetch(fontPath)).text();

        const parsedTopLevel = JSON.parse(jsonString);
        const topLevelEntries = Object.entries<object>(parsedTopLevel);
        const topLevelMap: Map<string, object> = new Map<string, object>(topLevelEntries);

        const charJson = JSON.stringify(topLevelMap.get('characters'));
        const e = Object.entries<CharProperties>(JSON.parse(charJson))
        const chars = new Map<string, CharProperties>(e);

        return new FontConfig(chars);
    }
}

class Character {

    private readonly sprite: Sprite;

    private readonly _advance: number;

    public get Advance(): number {
        return this._advance;
    }

    public get Sprite(): Sprite {
        return this.sprite;
    }

    constructor(
        private shader: Shader,
        private fontMap: Texture,
        private charConfig: CharProperties,
        private position: vec2,
        private scale: number) {
        this._advance = charConfig.advance * scale;

        const height = charConfig.height * scale;
        const width = charConfig.width * scale;
        const originX = charConfig.originX * scale;
        const originY = charConfig.originY * scale;

        const originYOffset = height - originY;
        const bottomY = position[1] + originYOffset;
        const topY = bottomY - height;
        const left = position[0] - originX;

        const vertices = Utils.CreateCharacterVertices(vec2.fromValues(left, topY), width, height);
        const s = charConfig.x / fontMap.Width;
        const t = charConfig.y / fontMap.Height;
        const uvs = Utils.CreateTextureCoordinates(s, t, charConfig.width / fontMap.Width, charConfig.height / fontMap.Height);

        this.sprite = new Sprite(vertices, uvs);
    }
}

export class Textbox implements IDisposable {
    private text: Character[] = [];
    private cursorX: number = 0;
    private maxCharacterHeight = 0;
    private position: vec2 = vec2.create();

    private constructor(private fontMap: Texture, private shader: Shader, private fontConfig: FontConfig) {
    }

    public static async Create(fontname: string): Promise<Textbox> {
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Font.frag');
        const fontMap = await TexturePool.GetInstance().GetTexture(`textures/Fonts/${fontname}/font.png`);
        const fontConfig = await FontConfigPool.GetInstance().GetFontConfig(`textures/Fonts/${fontname}/font.json`);

        return new Textbox(fontMap, shader, fontConfig)
            .WithHue(1).WithSaturation(0).WithValue(1);
    }

    public WithText(text: string, position: vec2, scale: number = 1.0): Textbox {
        this.text = [];
        this.cursorX = 0;
        this.position = position;

        const heights = [...this.fontConfig.characters.values()]
            .map(c => c.height);
        this.maxCharacterHeight = Math.max(...heights) * scale;

        for (const character of text) {
            const charConfig = this.fontConfig.characters.get(character)!;
            const charPos: vec2 = vec2.fromValues(position[0] + this.cursorX, position[1] + this.maxCharacterHeight);
            const renderableChar = new Character(this.shader, this.fontMap, charConfig, charPos, scale)
            this.text.push(renderableChar);
            this.cursorX += renderableChar.Advance;
        }

        return this;
    }

    public WithHue(hue: number): Textbox {
        this.shader.SetFloatUniform('hue', hue);
        return this;
    }

    public WithSaturation(saturation: number): Textbox {
        this.shader.SetFloatUniform('saturation', saturation);
        return this;
    }

    public WithValue(value: number): Textbox {
        this.shader.SetFloatUniform('value', value);
        return this;
    }

    public Draw(proj: mat4): void {
        gl.enable(gl.BLEND);

        if (this.text.length > 0) {
            const sprites = this.text.map(t => t.Sprite);
            const batch = new SpriteBatch(this.shader, sprites, this.fontMap); // TODO: recreating & destroying the batch in every frame seems very wasteful

            batch.Draw(proj, mat4.create());
            batch.Dispose();
        }

        gl.disable(gl.BLEND);
    }

    public get Width(): number {
        return this.cursorX + this.position[0];
    }

    public get Height(): number {
        return this.maxCharacterHeight;
    }

    /**
     * Helper function to predetermine the size of a textbox without creating and rendering one
     * @param text The text to 'prerender'
     * @param font The font that the text will be rendered in
     * @param scale The scaling factor of the rendered text
     * @returns An object containing the width and height of the rendered textbox
     */
    public static async PrecalculateDimensions(font: string, text: string, scale: number): Promise<{ width: number, height: number }> {
        const fontConfig = await FontConfigPool.GetInstance().GetFontConfig(`textures/Fonts/${font}/font.json`);
        let cursorX = 0;
        const heights = [...fontConfig.characters.values()]
            .map(c => c.height);
        const maxCharacterHeight = Math.max(...heights) * scale;

        for (const character of text) {
            const charConfig = fontConfig.characters.get(character)!;
            cursorX += charConfig.advance * scale;
        }

        return { width: cursorX, height: maxCharacterHeight };
    }

    public Dispose(): void {
        this.shader.Delete();
    }
}