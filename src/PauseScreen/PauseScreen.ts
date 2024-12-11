import { Background } from '../Background';
import { mat4, vec2, vec4 } from 'gl-matrix';
import { Textbox } from '../Textbox';
import { SpriteBatch } from '../SpriteBatch';
import { Shader } from '../Shader';
import { KeyHandler } from '../KeyHandler';
import { ControllerHandler } from '../ControllerHandler';
import { SoundEffectPool } from '../SoundEffectPool';
import { SoundEffect } from '../SoundEffect';
import { IQuitEventListener, IResumeEventListener } from '../Game';
import { IState } from './IState';
import { MainSelectionState } from './MainSelectionState';
import { QuitMenuState } from './QuitMenuState';
import { SharedVariables } from './SharedVariables';
import { IDisposable } from 'src/IDisposable';

export class PauseScreen implements IDisposable {
    private resumeEventListeners: IResumeEventListener[] = [];
    private quitEventListeners: IQuitEventListener[] = [];

    private mainSelectionState: MainSelectionState;
    public get MainSelectionState(): IState {
        return this.mainSelectionState;
    }

    private quitSelectionState: QuitMenuState;
    public get QuitSelectionState(): IState {
        return this.quitSelectionState;
    }

    private state: IState;

    private textProjMat: mat4;
    private selectedIndex: number = 0;
    public set SelectedIndex(value: number) {
        this.selectedIndex = value;
    }

    private selection: Textbox[];
    private subselectionIndex: number = 0;
    public set SubSelectionIndex(value: number) {
        this.subselectionIndex = value;
    }

    private subSelection: Textbox[];

    private sharedVariables: SharedVariables = {
        elapsedTimeSinceKeypress: 0,
        keyWasReleased: false
    };

    private constructor(
        private width: number,
        private height: number,
        private batch: SpriteBatch,
        private shader: Shader,
        private pausedTextbox: Textbox,
        private resumeTextbox: Textbox,
        private quitTextbox: Textbox,
        private areYouSureTextbox: Textbox,
        private yesTextbox: Textbox,
        private noTextbox: Textbox,
        private keyHandler: KeyHandler,
        private gamepadHandler: ControllerHandler,
        private menuSound: SoundEffect,
        private selectSound: SoundEffect
    ) {
        this.textProjMat = mat4.ortho(mat4.create(), 0, width, height, 0, -1, 1);
        this.selection = [resumeTextbox, quitTextbox];
        this.subSelection = [yesTextbox, noTextbox];
        this.ResetStates();
    }

    public static async Create(width: number, height: number, keyHandler: KeyHandler, gamepadHandler: ControllerHandler): Promise<PauseScreen> {
        const pausedText = "Paused";
        const pausedTextDimensions = await Textbox.PrecalculateDimensions('Consolas', pausedText, 1);
        const pausedTextBox = (await Textbox.Create('Consolas'))
            .WithText(pausedText, vec2.fromValues(width / 2 - pausedTextDimensions.width / 2, height / 4), 1);

        const resumeText = "Resume";
        const resumeTextDimensions = await Textbox.PrecalculateDimensions('Consolas', resumeText, 0.5);
        const resumeTextBox = (await Textbox.Create('Consolas'))
            .WithText(resumeText,
                vec2.fromValues(width / 2 - resumeTextDimensions.width / 2, height / 4 + resumeTextDimensions.height * 3),
                0.5);

        const quitText = "Quit";
        const quitTextDimensions = await Textbox.PrecalculateDimensions('Consolas', quitText, 0.5);
        const quitTextBox = (await Textbox.Create('Consolas')).WithText(quitText,
            vec2.fromValues(width / 2 - quitTextDimensions.width / 2, height / 4 + quitTextDimensions.height * 4),
            0.5);

        const areYouSureText = "Are you sure?";
        const areYouSureDimensions = await Textbox.PrecalculateDimensions('Consolas', areYouSureText, 0.5);
        const areYouSureTextBox = ((await Textbox.Create('Consolas')).WithText(areYouSureText,
            vec2.fromValues(width / 2 - areYouSureDimensions.width / 2, height / 4 + areYouSureDimensions.height * 5),
            0.5
        ));

        const yesNoDimensions = await Textbox.PrecalculateDimensions('Consolas', 'Yes No', 0.5);
        const spaceDimensions = await Textbox.PrecalculateDimensions('Consolas', ' ', 0.5);
        const yesTextBox = ((await Textbox.Create('Consolas')).WithText('Yes',
            vec2.fromValues(width / 2 - yesNoDimensions.width / 2, height / 4 + yesNoDimensions.height * 6),
            0.5
        ));

        const noTextBox = ((await Textbox.Create('Consolas')).WithText('No',
            vec2.fromValues(width / 2 + spaceDimensions.width, height / 4 + yesNoDimensions.height * 6),
            0.5
        ));

        const menuSound = await SoundEffectPool.GetInstance().GetAudio('audio/cursor1.wav');
        const selectSound = await SoundEffectPool.GetInstance().GetAudio('audio/pause.mp3');

        const shader = await Shader.Create('shaders/VertexShader.vert', 'shaders/Colored.frag');
        shader.SetVec4Uniform('clr', vec4.fromValues(0, 0, 0, 0.8));
        const background = new Background();
        const batch = new SpriteBatch(shader, [background], null);

        return new PauseScreen(width, height, batch, shader, pausedTextBox, resumeTextBox,
            quitTextBox, areYouSureTextBox, yesTextBox, noTextBox,
            keyHandler, gamepadHandler, menuSound, selectSound);
    }

    public Draw(proj: mat4): void {
        this.batch.Draw(proj, mat4.create());
        this.pausedTextbox.Draw(this.textProjMat);

        this.selection.forEach(s => s.WithSaturation(0).WithValue(0.3));
        this.selection[this.selectedIndex].WithHue(1).WithSaturation(0).WithValue(1);

        this.resumeTextbox.Draw(this.textProjMat);
        this.quitTextbox.Draw(this.textProjMat);

        if (this.state === this.quitSelectionState) {
            this.subSelection.forEach(s => s.WithSaturation(0).WithValue(0.3));
            this.subSelection[this.subselectionIndex].WithHue(1).WithSaturation(0).WithValue(1);

            this.areYouSureTextbox.Draw(this.textProjMat);
            this.yesTextbox.Draw(this.textProjMat);
            this.noTextbox.Draw(this.textProjMat);
        }
    }

    public async Update(elapsed: number): Promise<void> {
        await this.state.Update(elapsed, this.sharedVariables);
    }

    public SubscribeToResumeEvent(listener: IResumeEventListener) {
        this.resumeEventListeners.push(listener);
    }

    public SubscribeToQuitEvent(listener: IQuitEventListener) {
        this.quitEventListeners.push(listener);
    }

    public ChangeState(state: IState) {
        this.state.Exit();
        this.state = state;
        this.state.Enter();
    }

    public ResetStates(): void {
        this.mainSelectionState = new MainSelectionState(
            this, this.keyHandler, this.gamepadHandler, this.resumeEventListeners, this.menuSound, this.selectSound);
        this.quitSelectionState = new QuitMenuState(
            this, this.keyHandler, this.gamepadHandler, this.quitEventListeners, this.menuSound, this.selectSound);

        this.state = this.mainSelectionState;
    }

    public Dispose(): void {
        this.areYouSureTextbox.Dispose();
        this.noTextbox.Dispose();
        this.pausedTextbox.Dispose();
        this.yesTextbox.Dispose();
        this.batch.Dispose();
        this.shader.Delete();
        this.quitTextbox.Dispose();
        this.resumeTextbox.Dispose();
    }
}
