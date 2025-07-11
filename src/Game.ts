import { mat4, vec3 } from 'gl-matrix';
import { Environment } from './Environment';
import { KeyHandler } from './KeyHandler';
import { Level } from './Level';
import { gl, WebGLUtils } from './WebGLUtils';
import { SoundEffectPool } from './SoundEffectPool';
import { ControllerHandler } from './ControllerHandler';
import { TexturePool } from './TexturePool';
import { SoundEffect } from './SoundEffect';
import { MainScreen } from './MainScreen';
import { PauseScreen } from './PauseScreen/PauseScreen';
import { IDisposable } from './IDisposable';
import { UIService } from './UIService';
import { Camera } from './Camera';
import { RenderTarget } from './RenderTarget';
import { Texture } from './Texture';
import { SpriteBatch } from './SpriteBatch';
import { Shader } from './Shader';
import { Sprite } from './Sprite';
import { Utils } from './Utils';
import { IGameState } from './Game/IGameState';
import { SharedGameStateVariables } from './Game/SharedGameStateVariables';
import { InGameState } from './Game/InGameState';
import { PausedState } from './Game/PausedState';
import { NextLevelLoadState } from './Game/NextLevelLoadState';
import { StartScreenState } from './Game/StartScreenState';

export interface IStartEventListener {
    Start(): Promise<void>;
}

export interface IResumeEventListener {
    Resume(): Promise<void>;
}

export interface IQuitEventListener {
    Quit(): Promise<void>;
}

export interface INextLevelEvent {
    OnNextLevelEvent(levelName: string): Promise<void>;
}

export interface IRestartListener {
    OnRestartEvent(): void;
}

export interface IFadeOut {
    /**
     * Sets the screen 'darkness' to a given level.
     * 0 means completely visible, 1 is total darkness
     */
    SetFadeOut(value: number): void
}

// TODO: camera smoothing - the camera should not follow the hero, but a position that moves with the hero but at a slower rate
//  like MatchHeroPosition in dragon

// TODO: shake camera when attack hit

// TODO: ui builder framework
// TODO: flip sprite
// TODO: recheck every vector passing. Sometimes vectors need to be cloned
// TODO: update ts version
// TODO: texture map padding

export class Game implements IStartEventListener,
    IResumeEventListener,
    IQuitEventListener,
    IRestartListener,
    INextLevelEvent,
    IFadeOut,
    IDisposable {
    private readonly Width: number;
    private readonly Height: number;
    private start: number;

    private projectionMatrix = mat4.ortho(
        mat4.create(),
        0,
        Environment.HorizontalTiles,
        Environment.VerticalTiles,
        0,
        -1,
        1
    );

    private level: Level | null = null;

    public get Level(): Level | null {
        return this.level;
    }

    public set Level(value: Level | null) {
        this.level = value;
    }

    private musicVolumeStack: number[] = [];

    public START_SCREEN_STATE(): IGameState {
        return new StartScreenState(this, this.mainScreen);
    }

    public IN_GAME_STATE(): IGameState {
        return new InGameState(this, this.uiService, this.keyHandler, this.gamepadHandler, this.sharedGameStateVariables);
    }

    public PAUSED_STATE(): IGameState {
        return new PausedState(this, this.pauseScreen, this.sharedGameStateVariables, this.pauseSoundEffect, this.musicVolumeStack);
    }

    public NEXT_LEVEL_STATE(levelName: string): IGameState {
        return new NextLevelLoadState(this, this.sharedGameStateVariables, levelName);
    }

    private internalState: IGameState;

    private sharedGameStateVariables: SharedGameStateVariables = {
        elapsedTimeSinceStateChange: 0,
        keyWasReleased: true
    }

    private readonly _renderTargetTexture: Texture;
    private _renderTarget: RenderTarget;
    private _finalImage: SpriteBatch;
    private readonly _fullScreenSprite: Sprite;

    private constructor(private keyHandler: KeyHandler,
                        private gamepadHandler: ControllerHandler,
                        private uiService: UIService,
                        private mainScreen: MainScreen,
                        private pauseScreen: PauseScreen,
                        private pauseSoundEffect: SoundEffect,
                        private _backgroundShader: Shader) {
        this.Width = window.innerWidth;
        this.Height = window.innerHeight;

        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.viewport(0, 0, this.Width, this.Height);
        gl.clearColor(0, 0, 0, 1);

        mainScreen?.SubscribeToStartEvent(this);
        pauseScreen?.SubscribeToResumeEvent(this);
        pauseScreen?.SubscribeToQuitEvent(this);

        this._fullScreenSprite = new Sprite(
            Utils.DefaultFullscreenQuadVertices,
            Utils.DefaultFullscreenQuadTextureCoordinates);
        this._renderTargetTexture = Texture.empty(this.Width, this.Height);
        this._renderTarget = new RenderTarget(this._renderTargetTexture);
        this._finalImage = new SpriteBatch(this._backgroundShader, [this._fullScreenSprite], this._renderTargetTexture);

        this.internalState = this.START_SCREEN_STATE();

        this.start = performance.now();
    }

    public Dispose(): void {
        this.mainScreen.Dispose();
        this.pauseScreen.Dispose();
        this.level?.Dispose();
        this.uiService.Dispose();
        this._renderTarget.Dispose();
    }

    private camera = new Camera(vec3.create());

    public get Camera(): Camera {
        return this.camera;
    }

    public get KeyHandler(): KeyHandler {
        return this.keyHandler;
    }

    public get GamepadHandler(): ControllerHandler {
        return this.gamepadHandler;
    }

    public get UiService(): UIService {
        return this.uiService;
    }

    public async OnNextLevelEvent(levelName: string): Promise<void> {
        await this.ChangeState(this.NEXT_LEVEL_STATE(levelName));
    }

    public OnRestartEvent(): void {
    }

    public static async Create(keyHandler: KeyHandler, controllerHandler: ControllerHandler): Promise<Game> {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        WebGLUtils.CreateGLRenderingContext(canvas);
        await SoundEffectPool.GetInstance().Preload();
        await TexturePool.GetInstance().Preload();

        const bgShader: Shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/FragmentShader.frag');

        const uiService = new UIService(canvas.width, canvas.height);
        const pauseSoundEffect = await SoundEffectPool.GetInstance().GetAudio('audio/pause.mp3');
        const mainScreen = await MainScreen.Create(keyHandler, controllerHandler, canvas.width, canvas.height);
        const pauseScreen = await PauseScreen.Create(canvas.width, canvas.height, keyHandler, controllerHandler);
        return new Game(keyHandler, controllerHandler, uiService, mainScreen, pauseScreen, pauseSoundEffect, bgShader);
    }

    public async Start(): Promise<void> {
        await this.ChangeState(this.NEXT_LEVEL_STATE('levels/level1.json'));
    }

    public async Quit(): Promise<void> {
        await this.ChangeState(this.START_SCREEN_STATE());
    }

    public async ChangeState(state: IGameState): Promise<void> {
        this.sharedGameStateVariables.elapsedTimeSinceStateChange = 0;
        await this.internalState.Exit();
        this.internalState = state;
        await this.internalState.Enter();
    }

    public async Resume(): Promise<void> {
        await this.ChangeState(this.IN_GAME_STATE());
    }

    public SetFadeOut(value: number) {
        this._backgroundShader.SetFloatUniform('fadeFactor', value);
    }

    public async Run(): Promise<void> {
        const end = performance.now();
        const elapsed = Math.min(end - this.start, 32);
        this.start = end;
        this.Render(elapsed);
        await this.Update(elapsed);

        requestAnimationFrame(this.Run.bind(this));
    }

    private Render(elapsedTime: number): void {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        this._renderTarget?.Render(() => {
            this.internalState.Draw(elapsedTime, this.projectionMatrix);
        });

        this._finalImage.Draw(this.projectionMatrix, mat4.create());
    }

    private async Update(elapsedTime: number): Promise<void> {
        await this.internalState.Update(elapsedTime);
    }

}
