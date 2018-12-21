import { mat4, vec3 } from "gl-matrix";
import { Camera } from "./Camera";
import { Environment } from "./Environment";
import { KeyHandler } from "./KeyHandler";
import { Level } from "./Level";
import { gl, WebGLUtils } from "./WebGLUtils";

export class Game
{
    private Width: number;
    private Height: number;
    private Canvas: HTMLCanvasElement;
    private KeyHandler: KeyHandler;

    private FrameCount: number = 0;
    private level: Level;
    private projectionMatrix = mat4.create();
    private camera = new Camera();

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
    }

    public Run(): void
    {
        this.Update();
        this.Render();
    }

    private Render(): void
    {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.level.Draw(this.projectionMatrix, this.camera.GetViewMatrix());
        requestAnimationFrame(this.Run.bind(this));
    }

    private Update(): void
    {
        if (this.KeyHandler.IsPressed("a"))
        {
            this.camera.Move(vec3.fromValues(0.1, 0, 0));
        } else if (this.KeyHandler.IsPressed("d"))
        {
            this.camera.Move(vec3.fromValues(-0.1, 0, 0));
        }

        this.FrameCount++;
    }
}
