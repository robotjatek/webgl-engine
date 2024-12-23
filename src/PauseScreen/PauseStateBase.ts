import { KeyHandler } from '../KeyHandler';
import { ControllerHandler } from '../ControllerHandler';
import { Keys } from '../Keys';
import { SoundEffect } from '../SoundEffect';
import { XBoxControllerKeys } from '../XBoxControllerKeys';
import { IState } from './IState';
import { SharedVariables } from 'src/PauseScreen/SharedVariables';

export abstract class PauseStateBase implements IState {

    protected readonly keyPressWaitTime = 200;

    protected constructor(protected readonly numberOfItems: number,
        protected keyHandler: KeyHandler,
        protected gamepadHandler: ControllerHandler,
        protected menuSound: SoundEffect,
        protected selectSound: SoundEffect
    ) {
    }

    public abstract Enter(): void;

    public abstract Exit(): void;

    public async Update(delta: number, shared: SharedVariables): Promise<void> {
        shared.elapsedTimeSinceKeypress += delta;

        // Do not trigger enter handling when it is kept hold down. Wait for a release before allowing to trigger again
        if (!this.keyHandler.IsPressed(Keys.ENTER) && !this.gamepadHandler.IsPressed(XBoxControllerKeys.START)
            && !shared.keyWasReleased && shared.elapsedTimeSinceKeypress > 200) {
            shared.keyWasReleased = true;
        }
    }

}
