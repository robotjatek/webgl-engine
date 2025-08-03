import { IGameobject } from '../../IGameobject';
import { BoundingBox } from '../../BoundingBox';
import { IProjectile } from '../../Projectiles/IProjectile';
import { mat4, vec2, vec3 } from 'gl-matrix';
import { Hero } from '../../Hero/Hero';
import { SpriteRenderer } from '../../SpriteRenderer';
import { Sprite } from '../../Sprite';
import { Shader } from '../../Shader';
import { Texture } from '../../Texture';
import { Utils } from '../../Utils';
import { SoundEffectPool } from '../../SoundEffectPool';
import { Environment } from '../../Environment';
import { Level } from '../../Level';
import { LeverStatusChanged } from './LeverStatusChanged';

export enum LeverStates {
    LEFT, RIGHT
}

export class Lever implements IGameobject {

    public static readonly STATES = LeverStates;

    private readonly renderer: SpriteRenderer;
    private readonly sprite: Sprite;

    protected readonly bbRenderer: SpriteRenderer;
    private readonly bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);

    private state: LeverStates = LeverStates.LEFT;

    public constructor(
        private position: vec3,
        private shader: Shader,
        private texture: Texture,
        private level: Level,
        private eventId: string
    ) {
        this.sprite = new Sprite(Utils.DefaultSpriteVertices, Utils.CreateTextureCoordinates(0, 0, 1 / 2, 1));
        this.renderer = new SpriteRenderer(shader, texture, this.sprite, vec2.fromValues(1.5, 1.5));

        this.bbSprite = new Sprite(Utils.DefaultSpriteVertices, Utils.DefaultSpriteTextureCoordinates);
        this.bbRenderer = new SpriteRenderer(shader, null, this.bbSprite, vec2.fromValues(1.5, 1.5));
    }

    public static async Create(position: vec3, level: Level, eventId: string): Promise<Lever> {
        // TODO: I dont need a shader every time i just have to set the uniforms before drawing
        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/FragmentShader.frag');
        return new Lever(position, shader, await Texture.Create('textures/lever.png'), level, eventId);
    }

    public get BoundingBox(): BoundingBox {
        // Same size as the object itself
        return new BoundingBox(this.position, vec2.fromValues(1.5, 1.5));
    }

    public async CollideWithAttack(attack: IProjectile): Promise<void> {
        await (await SoundEffectPool.GetInstance().GetAudio('audio/bridge/click.mp3', true)).Play();
        if (this.state === LeverStates.LEFT) {
            this.state = LeverStates.RIGHT;
            this.renderer.TextureOffset = vec2.fromValues(1 / 2, 0);
        } else {
            this.state = LeverStates.LEFT;
            this.renderer.TextureOffset = vec2.fromValues(0 / 2, 0);
        }

        this.level.Eventbus.Publish(new LeverStatusChanged(this.eventId, this.state));
    }

    public async Update(delta: number): Promise<void> {
        return Promise.resolve(undefined);
    }

    public Draw(proj: mat4, view: mat4): void {
        this.renderer.Draw(proj, view, this.position, 0);
        if (Environment.RenderBoundingBoxes) {
            this.bbRenderer.Draw(proj, view, this.BoundingBox.position, 0);
        }
    }

    public get EndCondition(): boolean {
        return false;
    }

    public IsCollidingWith(boundingBox: BoundingBox, collideWithUndefined: boolean): boolean {
        return boundingBox.IsCollidingWith(this.BoundingBox);
    }

    public async Visit(hero: Hero): Promise<void> {
        // NO-OP
    }

    public Dispose(): void {
        this.renderer.Dispose();
    }
}
