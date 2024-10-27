import { SharedDragonStateVariables } from './SharedDragonStateVariables';

export interface IState {
    Update(delta: number, shared: SharedDragonStateVariables): void;
}
