export interface IControlSource {
    Left(): boolean;

    Right(): boolean;

    Jump(): boolean;

    Stomp(): boolean;

    Attack(): boolean;

    Dash(): boolean;
}
