import { SharedDragonStateVariables } from './SharedDragonStateVariables';

export interface IState {
    Enter(): void;
    Update(delta: number, shared: SharedDragonStateVariables): Promise<void>;
    Exit(): void;
}
