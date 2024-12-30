export interface IState {
    Enter(): Promise<void>;
    Update(delta: number): Promise<void>;
    Exit(): Promise<void>;
}
