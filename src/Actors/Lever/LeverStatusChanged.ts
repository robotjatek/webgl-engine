import { LeverStates } from './Lever';
import { IMessage } from '../../Level';

export class LeverStatusChanged implements IMessage{
    constructor(
        public readonly identifier: string,
        public readonly status: LeverStates
    ) {
    }
}
