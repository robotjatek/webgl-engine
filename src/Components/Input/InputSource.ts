export class InputSource {

    private pressedKeys = new Set<string>();

    public PressKey(key: "left" | "right") {
        this.pressedKeys.add(key);
    }

    public IsPressed(key: string): boolean {
        if (this.pressedKeys.has(key)) {
            this.pressedKeys.delete(key);
            return true;
        }

        return false;
    }

}
