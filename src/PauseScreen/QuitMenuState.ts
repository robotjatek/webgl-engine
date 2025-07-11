import { KeyHandler } from '../KeyHandler';
import { ControllerHandler } from '../ControllerHandler';
import { Keys } from '../Keys';
import { SoundEffect } from '../SoundEffect';
import { IQuitEventListener } from '../Game/Game';
import { PauseStateBase } from './PauseStateBase';
import { PauseScreen } from './PauseScreen';
import { SharedVariables } from 'src/PauseScreen/SharedVariables';
import { XBoxControllerKeys } from 'src/XBoxControllerKeys';

export class QuitMenuState extends PauseStateBase {
    private selectedIndex: number = 0;

    public constructor(private context: PauseScreen,
        keyHandler: KeyHandler,
        controllerHandler: ControllerHandler,
        private quitListeners: IQuitEventListener[],
        menuSound: SoundEffect,
        selectSound: SoundEffect
    ) {
        super(2, keyHandler, controllerHandler, menuSound, selectSound);
    }

    public override Enter(): void {
        this.selectedIndex = 0;
    }

    public override Exit(): void {
        this.selectedIndex = 0;
    }

    public override async Update(delta: number, shared: SharedVariables): Promise<void> {
        await super.Update(delta, shared);

        if ((this.keyHandler.IsPressed(Keys.A) || this.gamepadHandler.IsPressed(XBoxControllerKeys.LEFT))
            && shared.elapsedTimeSinceKeypress > this.keyPressWaitTime) {
            await this.menuSound.Play(1, 0.5);
            shared.elapsedTimeSinceKeypress = 0;
            this.selectedIndex--;
            if (this.selectedIndex < 0) {
                this.selectedIndex = this.numberOfItems - 1;
            }
        } else if ((this.keyHandler.IsPressed(Keys.D) || this.gamepadHandler.IsPressed(XBoxControllerKeys.RIGHT))
            && shared.elapsedTimeSinceKeypress > this.keyPressWaitTime) {
            await this.menuSound.Play(1, 0.5);
            shared.elapsedTimeSinceKeypress = 0;
            this.selectedIndex++;
            if (this.selectedIndex >= this.numberOfItems) {
                this.selectedIndex = 0;
            }
        } else if (
            (this.keyHandler.IsPressed(Keys.ENTER)
                || this.gamepadHandler.IsPressed(XBoxControllerKeys.A)
                || this.gamepadHandler.IsPressed(XBoxControllerKeys.START))
            && shared.elapsedTimeSinceKeypress > this.keyPressWaitTime && shared.keyWasReleased) {
            shared.elapsedTimeSinceKeypress = 0;
            await this.selectSound.Play();
            shared.keyWasReleased = false;
            if (this.selectedIndex === 0) { // yes
                this.context.SelectedIndex = 0;
                for (const listener of this.quitListeners) {
                    await listener.Quit();
                }
            }
            this.context.ChangeState(this.context.MAIN_SELECTION_STATE());
        }

        this.context.SubSelectionIndex = this.selectedIndex;
    }
}
