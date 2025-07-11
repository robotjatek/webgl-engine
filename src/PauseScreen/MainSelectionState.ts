import { KeyHandler } from '../KeyHandler';
import { ControllerHandler } from '../ControllerHandler';
import { Keys } from '../Keys';
import { SoundEffect } from '../SoundEffect';
import { IResumeEventListener } from '../Game';
import { PauseStateBase } from './PauseStateBase';
import { PauseScreen } from './PauseScreen';
import { SharedVariables } from 'src/PauseScreen/SharedVariables';
import { XBoxControllerKeys } from 'src/XBoxControllerKeys';

export class MainSelectionState extends PauseStateBase {

    public constructor(private context: PauseScreen,
                       keyhandler: KeyHandler,
                       gamepadHandler: ControllerHandler,
                       private resumeListeners: IResumeEventListener[],
                       menuSound: SoundEffect,
                       selectSound: SoundEffect,
                       private selectedIndex: number
    ) {
        super(2, keyhandler, gamepadHandler, menuSound, selectSound);
    }

    public override Enter(): void {
    }

    public override Exit(): void {
    }

    public override async Update(delta: number, shared: SharedVariables): Promise<void> {
        await super.Update(delta, shared);

        if ((this.keyHandler.IsPressed(Keys.S) || this.gamepadHandler.IsPressed(XBoxControllerKeys.DOWN))
            && shared.elapsedTimeSinceKeypress > this.keyPressWaitTime) {
            await this.menuSound.Play(1, 0.5);
            shared.elapsedTimeSinceKeypress = 0;
            this.selectedIndex++;
            if (this.selectedIndex >= this.numberOfItems) {
                this.selectedIndex = 0;
            }
        } else if ((this.keyHandler.IsPressed(Keys.W) || this.gamepadHandler.IsPressed(XBoxControllerKeys.UP))
            && shared.elapsedTimeSinceKeypress > this.keyPressWaitTime) {
            await this.menuSound.Play(1, 0.5);
            shared.elapsedTimeSinceKeypress = 0;
            this.selectedIndex--;
            if (this.selectedIndex < 0) {
                this.selectedIndex = this.numberOfItems - 1;
            }
        } else if (
            (this.keyHandler.IsPressed(Keys.ENTER)
                || this.gamepadHandler.IsPressed(XBoxControllerKeys.A)
                || this.gamepadHandler.IsPressed(XBoxControllerKeys.START))
            && shared.elapsedTimeSinceKeypress > this.keyPressWaitTime && shared.keyWasReleased) {
            shared.elapsedTimeSinceKeypress = 0;
            shared.keyWasReleased = false;
            await this.selectSound.Play();

            if (this.selectedIndex === 0) { // resume
                for (const r of this.resumeListeners) {
                    await r.Resume();
                }
            } else if (this.selectedIndex === 1) { // quit
                this.context.ChangeState(this.context.QUIT_SELECTION_STATE());
            }
        }
        this.context.SelectedIndex = this.selectedIndex;
    }

}
