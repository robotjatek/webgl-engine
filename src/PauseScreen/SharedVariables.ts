/**
 * Contains the variables shared by all of the states of the state machine
 */
export type SharedVariables = {
    elapsedTimeSinceKeypress: number;
    keyWasReleased: boolean;
};
