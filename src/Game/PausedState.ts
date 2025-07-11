import { GameStateBase } from './GameStateBase';
import { PauseScreen } from '../PauseScreen/PauseScreen';
import { SharedGameStateVariables } from './SharedGameStateVariables';
import { SoundEffect } from '../SoundEffect';
import { mat4 } from 'gl-matrix';
import { Game } from './Game';

export class PausedState extends GameStateBase {

    public constructor(private readonly game: Game,
                       private readonly pauseScreen: PauseScreen,
                       sharedGameStateVariables: SharedGameStateVariables,
                       private readonly pauseSoundEffect: SoundEffect,
                       private readonly musicVolumeStack: number[]) {
        super(sharedGameStateVariables);
    }

    public override async UpdateState(delta: number): Promise<void> {
        await this.pauseScreen.Update(delta);
    }

    public Draw(elapsed: number, projectionMatrix: mat4): void {
        this.pauseScreen.Draw(projectionMatrix);
    }

    public async Enter(): Promise<void> {
        await this.pauseSoundEffect.Play();
        this.musicVolumeStack.push(this.game.Level!.GetMusicVolume());
        this.game.Level!.SetMusicVolume(this.musicVolumeStack.slice(-1)[0] * 0.15);
    }

    public async Exit(): Promise<void> {
        this.game.Level!.SetMusicVolume(this.musicVolumeStack.pop()!);
    }
}
