import { mat4, vec2, vec3 } from 'gl-matrix';
import { AnimatedSprite } from './AnimatedSprite';
import { Camera } from './Camera';
import { Environment } from './Environment';
import { KeyHandler } from './KeyHandler';
import { Level } from './Level';
import { Shader } from './Shader';
import { SpriteBatch } from './SpriteBatch';
import { TexturePool } from './TexturePool';
import { Utils } from './Utils';
import { gl, WebGLUtils } from './WebGLUtils';
import { Hero } from './Hero';

export class Game {
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
  private animatedCoinBatch: SpriteBatch;

  private hero: Hero;

  public constructor(keyhandler: KeyHandler) {
    this.Width = window.innerWidth;
    this.Height = window.innerHeight;
    this.Canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.Canvas.width = this.Width;
    this.Canvas.height = this.Height;
    this.KeyHandler = keyhandler;

    this.projectionMatrix = mat4.ortho(
      this.projectionMatrix,
      0,
      Environment.HorizontalTiles,
      Environment.VerticalTiles,
      0,
      -1,
      1
    );
    WebGLUtils.CreateGLRenderingContext(this.Canvas);
    gl.disable(gl.DEPTH_TEST);
    gl.viewport(0, 0, this.Width, this.Height);
    gl.clearColor(0, 1, 0, 1);

    this.level = new Level('');
    this.start = new Date();

    const texture = TexturePool.GetInstance().GetTexture('coin.png');
    this.animSprite = new AnimatedSprite(
      Utils.CreateSpriteVertices(10, 10),
      Utils.CreateTextureCoordinates(0, 0, 1.0 / 10, 1.0)
    );
    this.animatedCoinBatch = new SpriteBatch(
      new Shader('shaders/VertexShader.vert', 'shaders/FragmentShader.frag'),
      [this.animSprite],
      texture
    );

    this.hero = new Hero(vec3.fromValues(0, Environment.VerticalTiles - 5, 1), vec2.fromValues(3, 3));
  }

  public Run(): void {
    const end = new Date();
    const elapsed = end.getTime() - this.start.getTime();
    this.start = end;

    this.Render();
    this.Update(elapsed);
  }

  private Render(): void {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    this.level.Draw(this.projectionMatrix, this.camera.GetViewMatrix());
    this.animatedCoinBatch.Draw(
      this.projectionMatrix,
      this.camera.GetViewMatrix()
    );
    this.hero.Draw(this.projectionMatrix, this.camera.GetViewMatrix());
    requestAnimationFrame(this.Run.bind(this));
  }

  private Update(elapsedTime: number): void {
    this.hero.Update(elapsedTime);
    
    if (this.KeyHandler.IsPressed('a')) {
      this.hero.MoveLeft(elapsedTime);
    } else if (this.KeyHandler.IsPressed('d')) {
      this.hero.MoveRight(elapsedTime);
    }
    this.animSprite.Update(elapsedTime);
    this.FrameCount++;
  }
}
