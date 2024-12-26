import { IDisposable } from '../IDisposable';


export interface ILevelEvent extends IDisposable {
    Update(delta: number): Promise<void>;
    get EventKey(): string;

    /**
     * Determines if the event can start.
     * Used for events started by an event trigger.
     * After the trigger fires the CanStart is set to false to avoid multiple start events.
     */
    get CanStart(): boolean;
}
