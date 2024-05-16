import { Background } from './Background';
import { mat4, vec2, vec4 } from 'gl-matrix';
import { Textbox } from './Textbox';
import { SpriteBatch } from './SpriteBatch';
import { Shader } from './Shader';
import { KeyHandler } from './KeyHandler';
import { ControllerHandler } from './ControllerHandler';
import { Keys } from './Keys';
import { SoundEffectPool } from './SoundEffectPool';
import { SoundEffect } from './SoundEffect';
import { IQuitEventListener, IResumeEventListener } from './Game';
import { XBoxControllerKeys } from './XBoxControllerKeys';

enum State {
    MAIN_SELECTION = 'main_selection',
    QUIT_MENU = 'quit_menu'
}

// TODO: implement state machine for pause screen
export class PauseScreen {
    private state: State = State.MAIN_SELECTION;

    private textProjMat: mat4;
    private selectedIndex: number = 0;
    private selection: Textbox[];
    private subselectionIndex: number = 0;
    private subSelection: Textbox[];
    private elapsedTimeSinceLastKeypress = 0;
    private keyWasReleased = false;

    private resumeEventListener: IResumeEventListener;
    private quitEventListener: IQuitEventListener;

    private constructor(
        private width: number,
        private height: number,
        private batch: SpriteBatch,
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

        return new PauseScreen(width, height, batch, pausedTextBox, resumeTextBox,
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

        if (this.state === State.QUIT_MENU) {
            this.subSelection.forEach(s => s.WithSaturation(0).WithValue(0.3));
            this.subSelection[this.subselectionIndex].WithHue(1).WithSaturation(0).WithValue(1);

            this.areYouSureTextbox.Draw(this.textProjMat);
            this.yesTextbox.Draw(this.textProjMat);
            this.noTextbox.Draw(this.textProjMat);
        }
    }

    public Update(elapsed: number): void {
        this.elapsedTimeSinceLastKeypress += elapsed;

        if (!this.keyHandler.IsPressed(Keys.ENTER) && !this.gamepadHandler.IsPressed(XBoxControllerKeys.START)
            && !this.keyWasReleased && this.elapsedTimeSinceLastKeypress > 200) {
            this.keyWasReleased = true;
        }

        if (this.state === State.MAIN_SELECTION) {
            if ((this.keyHandler.IsPressed(Keys.S) || this.gamepadHandler.IsPressed(XBoxControllerKeys.DOWN))
                && this.elapsedTimeSinceLastKeypress > 200) {
                this.menuSound.Play(1, 0.5);
                this.elapsedTimeSinceLastKeypress = 0;
                this.selectedIndex++;
                if (this.selectedIndex >= this.selection.length) {
                    this.selectedIndex = 0;
                }
            } else if ((this.keyHandler.IsPressed(Keys.W) || this.gamepadHandler.IsPressed(XBoxControllerKeys.UP))
                && this.elapsedTimeSinceLastKeypress > 200) {
                this.menuSound.Play(1, 0.5);
                this.elapsedTimeSinceLastKeypress = 0;
                this.selectedIndex--;
                if (this.selectedIndex < 0) {
                    this.selectedIndex = this.selection.length - 1;
                }
            } else if ((this.keyHandler.IsPressed(Keys.ENTER) ||
                this.gamepadHandler.IsPressed(XBoxControllerKeys.START) ||
                this.gamepadHandler.IsPressed(XBoxControllerKeys.A)) &&
                this.keyWasReleased && this.elapsedTimeSinceLastKeypress > 200) {

                this.selectSound.Play();
                this.elapsedTimeSinceLastKeypress = 0;
                if (this.selectedIndex === 0) { // resume
                    this.keyWasReleased = false;
                    this.resumeEventListener.Resume();
                } else if (this.selectedIndex === 1) { // quit
                    this.state = State.QUIT_MENU;
                }
            }
        } else if (this.state === State.QUIT_MENU) {
            if ((this.keyHandler.IsPressed(Keys.D) || this.gamepadHandler.IsPressed(XBoxControllerKeys.RIGHT))
                && this.elapsedTimeSinceLastKeypress > 200) {
                this.elapsedTimeSinceLastKeypress = 0;

                this.menuSound.Play();
                this.subselectionIndex++;
                if (this.subselectionIndex >= this.subSelection.length) {
                    this.subselectionIndex = 0;
                }
            } else if ((this.keyHandler.IsPressed(Keys.A) || this.gamepadHandler.IsPressed(XBoxControllerKeys.LEFT))
                && this.elapsedTimeSinceLastKeypress > 200) {
                this.elapsedTimeSinceLastKeypress = 0;

                this.menuSound.Play();
                this.subselectionIndex--;
                if (this.subselectionIndex < 0) {
                    this.subselectionIndex = this.subSelection.length - 1;
                }
            } else if ((this.keyHandler.IsPressed(Keys.ENTER)
                || this.gamepadHandler.IsPressed(XBoxControllerKeys.A)
                || this.gamepadHandler.IsPressed(XBoxControllerKeys.START))
                && this.keyWasReleased && this.elapsedTimeSinceLastKeypress > 200) {
                this.selectSound.Play();
                this.elapsedTimeSinceLastKeypress = 0;
                if (this.subselectionIndex === 0) {
                    this.keyWasReleased = false;
                    this.subselectionIndex = 0;
                    this.selectedIndex = 0;
                    this.state = State.MAIN_SELECTION;
                    this.quitEventListener.Quit();
                } else { // No
                    this.keyWasReleased = false;
                    this.subselectionIndex = 0;
                    this.state = State.MAIN_SELECTION;
                }
            }
        }
    }

    public SubscribeToResumeEvent(listener: IResumeEventListener) {
        this.resumeEventListener = listener;
    }

    public SubscribeToQuitEvent(listener: IQuitEventListener) {
        this.quitEventListener = listener;
    }
}
