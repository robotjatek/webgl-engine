export class Lock {
    private waitMap = new Map<string, (() => void)[]>();

    public async lock(key: string): Promise<void> {
        return new Promise((resolve) => {
            if (!this.waitMap.has(key)) {
                this.waitMap.set(key, []);
                resolve();
            } else {
                const waitQueue = this.waitMap.get(key);
                waitQueue.push(() => resolve());
            }
        });
    }

    public async release(key: string): Promise<void> {
        const waitQueue = this.waitMap.get(key);

        if (!waitQueue || waitQueue.length === 0) {
            this.waitMap.delete(key);
            return Promise.resolve();
        }

        const resolver = waitQueue.shift(); // next task
        resolver();
        return Promise.resolve();
    }
}
