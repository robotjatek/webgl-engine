export class KeyHandler
{
    private keys = new Map<string, boolean>();

    public SetKey(code: string, state: boolean): void
    {
        this.keys.set(code, state);
    }

    public IsPressed(code: string): boolean
    {
        if (this.keys.has(code))
        {
            return this.keys.get(code);
        }

        return false;
    }
}
