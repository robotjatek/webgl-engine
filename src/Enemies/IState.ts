export interface IState {
    Enter(): void;
    Update(delta: number): Promise<void>;
    Exit(): void;
}
