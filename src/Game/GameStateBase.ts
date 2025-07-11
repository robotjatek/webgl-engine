import { IGameState } from './IGameState';
import { mat4 } from 'gl-matrix';

import { SharedGameStateVariables } from './SharedGameStateVariables';

export abstract class GameStateBase implements IGameState {

    protected constructor(protected sharedGameStateVariables: SharedGameStateVariables) {
    }

    public abstract Draw(elapsed: number, projectionMatrix: mat4): void;

    public abstract Enter(): Promise<void>;

    public abstract Exit(): Promise<void>;

    public async Update(delta: number): Promise<void> {
        this.sharedGameStateVariables.elapsedTimeSinceStateChange += delta;
        await this.UpdateState(delta);
    }

    protected abstract UpdateState(delta: number): Promise<void>;
}
