export interface SequenceStep {
    Update(delta: number): Promise<boolean>;
}