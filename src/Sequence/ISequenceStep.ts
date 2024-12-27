export interface ISequenceStep {
    Update(delta: number): Promise<boolean>;
}