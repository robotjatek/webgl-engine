import { mat4 } from "gl-matrix";
import { Background } from "./Background";
import { Environment } from "./Environment";
import { Shader } from "./Shader";
import { Sprite } from "./Sprite";
import { SpriteBatch } from "./SpriteBatch";
import { Texture } from "./Texture";
import { gl, WebGLUtils } from "./WebGLUtils";

export class Game
{
    private Width: number;
    private Height: number;
    private Canvas: HTMLCanvasElement;

    private spriteBatch: SpriteBatch;
    private background: SpriteBatch;
    private projectionMatrix = mat4.create();
    private viewMatrix = mat4.create();

    public constructor()
    {
        this.Width = window.innerWidth;
        this.Height = window.innerHeight;
        this.Canvas = document.getElementById("canvas") as HTMLCanvasElement;
        this.Canvas.width = this.Width;
        this.Canvas.height = this.Height;

        this.projectionMatrix = mat4.ortho(
            this.projectionMatrix, 0, Environment.HorizontalTiles, Environment.VerticalTiles, 0, -1, 1);
        this.viewMatrix = mat4.identity(this.viewMatrix);
        WebGLUtils.CreateGLRenderingContext(this.Canvas);
        gl.disable(gl.DEPTH_TEST);
        gl.viewport(0, 0, this.Width, this.Height);
        gl.clearColor(0, 1, 0, 1);

        const vertices = [
            0.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            0,  1.0, 0.0,

            0,  1.0, 0.0,
            1.0, 0, 0.0,
            1.0, 1.0, 0.0,
        ];

        const texCoords = [
            0, 0,
            1, 0,
            0, 1,
            0, 1,
            1, 0,
            1, 1,
        ];

        const shader = new Shader("shaders/VertexShader.vert", "shaders/FragmentShader.frag");
        this.spriteBatch = new SpriteBatch(shader, [new Sprite(vertices, texCoords)], new Texture("ground0.png"));
        this.background = new SpriteBatch(shader, [new Background()], new Texture("bg.jpg"));
    }

    public Run(): void
    {
        this.Update();
        this.Render();
    }

    public Resize(): void
    {
        this.Width = window.innerWidth;
        this.Height = window.innerHeight;
        this.Canvas.width = this.Width;
        this.Canvas.height = this.Height;
        gl.viewport(0, 0, this.Width, this.Height);
    }

    private Render(): void
    {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        this.background.Draw(this.projectionMatrix, this.viewMatrix);
        this.spriteBatch.Draw(this.projectionMatrix, this.viewMatrix);
        requestAnimationFrame(this.Run.bind(this));
    }

    private Update(): void
    {
    }
}
