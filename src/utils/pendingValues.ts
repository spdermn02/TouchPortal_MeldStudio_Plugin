/*
  Meld's session snapshot lags behind writes (its autosave debounce), so reading the snapshot right
  after a setProperty can return the old value - a quick second Toggle would then repeat the first
  write instead of undoing it. Remember what we last wrote per object+property and prefer it until
  the snapshot catches up, or until it expires in case Meld dropped the write.
  Shared by every action so two buttons on the same layer build on each other's presses.
*/
const PENDING_TTL_MS = 3000;

type Pending = { value: any, expires: number };

class PendingValues {
    private pending: Map<string, Pending> = new Map();

    private key(objectId: string, property: string) {
        return objectId + ':' + property;
    }
    // Value to toggle from: the pending write if it's still in flight, otherwise the snapshot
    get(objectId: string, property: string, snapshotValue: any) {
        const key = this.key(objectId, property);
        const entry = this.pending.get(key);
        if (!entry) return snapshotValue;
        if (Date.now() > entry.expires || entry.value === snapshotValue) {
            // Expired, or Meld's snapshot has caught up
            this.pending.delete(key);
            return snapshotValue;
        }
        return entry.value;
    }
    set(objectId: string, property: string, value: any) {
        this.pending.set(this.key(objectId, property), { value, expires: Date.now() + PENDING_TTL_MS });
    }
    clear() {
        this.pending.clear();
    }
}

export const pendingValues = new PendingValues();
