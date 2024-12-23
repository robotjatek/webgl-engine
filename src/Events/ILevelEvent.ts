import { IDisposable } from '../IDisposable';


export interface ILevelEvent extends IDisposable {
    Update(delta: number): void;
    get EventKey(): string;
    get CanStart(): boolean;
}
