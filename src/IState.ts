export interface IState {
    Update(delta: number): Promise<void>;
    Enter(): Promise<void>;
    Exit(): Promise<void>;
}
