import { SharedDragonStateVariables } from './SharedDragonStateVariables';

export interface IState {
    Enter(): void;
    Update(delta: number, shared: SharedDragonStateVariables): Promise<void>; // TODO: a "shared" változót konstruktorban átadni?
    Exit(): void;
}
