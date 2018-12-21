import { mat4, vec3 } from "gl-matrix";
import { AnimatedSprite } from "./AnimatedSprite";
import { Camera } from "./Camera";
import { Environment } from "./Environment";
import { KeyHandler } from "./KeyHandler";
import { Level } from "./Level";
import { Shader } from "./Shader";
import { SpriteBatch } from "./SpriteBatch";
import { TexturePool } from "./TexturePool";
import { Utils } from "./Utils";
import { gl, WebGLUtils } from "./WebGLUtils";

export class Game
{
    private Width: number;
    private Height: number;
    private Canvas: HTMLCanvasElement;
    private KeyHandler: KeyHandler;
    private start: Date;

    private FrameCount: number = 0;
    private level: Level;
    private projectionMatrix = mat4.create();
    private camera = new Camera();

    private animSprite: AnimatedSprite;
    private spb: SpriteBatch;

    public constructor(keyhandler: KeyHandler)
    {
        this.Width = window.innerWidth;
        this.Height = window.innerHeight;
        this.Canvas = document.getElementById("canvas") as HTMLCanvasElement;
        this.Canvas.width = this.Width;
        this.Canvas.height = this.Height;
        this.KeyHandler = keyhandler;

        this.projectionMatrix = mat4.ortho(
            this.projectionMatrix, 0, Environment.HorizontalTiles, Environment.VerticalTiles, 0, -1, 1);
        WebGLUtils.CreateGLRenderingContext(this.Canvas);
        gl.disable(gl.DEPTH_TEST);
        gl.viewport(0, 0, this.Width, this.Height);
        gl.clearColor(0, 1, 0, 1);

        this.level = new Level("");
        this.start = new Date();

        const t = TexturePool.GetInstance().GetTexture("coin.png");
        this.animSprite =  new AnimatedSprite(
            Utils.DefaultSpriteVertices,
            Utils.CreateTextureCoordinates(0, 0, 1.0 / 10, 1.0));
        this.spb = new SpriteBatch(
            new Shader("shaders/VertexShader.vert", "shaders/FragmentShader.frag"),
            [this.animSprite],
            t);
    }

    public Run(): void
    {
        const end = new Date();
        const elapsed = end.getTime() - this.start.getTime();
        this.start = end;

        this.Render();
        this.Update(elapsed);
    }

    private Render(): void
    {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.level.Draw(this.projectionMatrix, this.camera.GetViewMatrix());
        this.spb.Draw(this.projectionMatrix, this.camera.GetViewMatrix());
        requestAnimationFrame(this.Run.bind(this));
    }

    private Update(elapsedTime: number): void
    {
        if (this.KeyHandler.IsPressed("a"))
        {
            this.camera.Move(vec3.fromValues(0.1, 0, 0));
        } else if (this.KeyHandler.IsPressed("d"))
        {
            this.camera.Move(vec3.fromValues(-0.1, 0, 0));
        }
        this.animSprite.Update(elapsedTime);
        this.FrameCount++;
    }
}
