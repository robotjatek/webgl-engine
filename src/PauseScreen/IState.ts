import { SharedVariables } from 'src/PauseScreen/SharedVariables';

export interface IState {
    Update(delta: number, shared: SharedVariables): void;
    Enter(): void;
    Exit(): void;
}
