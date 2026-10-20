import { DEBUG_MODE, STATES_READY } from '../consts';

/**
 * Centralized state manager that:
 * 1. Tracks all state values that have been sent to TouchPortal
 * 2. Only sends updates if the value actually changed
 * 3. Respects the global STATES_READY flag
 */
class StateManager {
    private tp: any = null;
    private stateValues: Map<string, string> = new Map(); // stateId -> last sent value

    /**
     * Initialize the state manager with the TouchPortal client
     */
    init(tpClient: any) {
        this.tp = tpClient;
    }

    /**
     * Update a single state, only if value changed and states are ready
     * Returns true if update was sent, false if skipped
     */
    updateState(stateId: string, value: string): boolean {
        if (!STATES_READY) {
            if (DEBUG_MODE && this.tp) {
                this.tp.logIt("DEBUG", `StateManager: Skipping update (not ready) - ${stateId}`);
            }
            return false;
        }

        const lastValue = this.stateValues.get(stateId);
        if (lastValue === value) {
            // Value unchanged, skip update
            return false;
        }

        // Value changed, send update
        this.stateValues.set(stateId, value);
        if (this.tp) {
            this.tp.stateUpdate(stateId, value);
        }
        return true;
    }

    /**
     * Update multiple states, filtering out unchanged values
     * Returns the number of updates actually sent
     */
    updateStateMany(states: Array<{ id: string, value: string }>): number {
        if (!STATES_READY) {
            if (DEBUG_MODE && this.tp) {
                this.tp.logIt("DEBUG", `StateManager: Skipping batch update (not ready) - ${states.length} states`);
            }
            return 0;
        }

        // Filter to only states that have changed
        const changedStates = states.filter(state => {
            const lastValue = this.stateValues.get(state.id);
            return lastValue !== state.value;
        });

        if (changedStates.length === 0) {
            return 0;
        }

        // Update cache and send
        changedStates.forEach(state => {
            this.stateValues.set(state.id, state.value);
        });

        if (this.tp && this.tp.stateUpdateMany) {
            this.tp.stateUpdateMany(changedStates);
        }

        if (DEBUG_MODE && this.tp) {
            this.tp.logIt("DEBUG", `StateManager: Sent ${changedStates.length}/${states.length} changed states`);
        }

        return changedStates.length;
    }

    /**
     * Clear cached value for a state (use when state is removed)
     */
    clearState(stateId: string) {
        this.stateValues.delete(stateId);
    }

    /**
     * Clear all cached values (use on reconnect/reset)
     */
    clearAll() {
        this.stateValues.clear();
    }

    /**
     * Get the last sent value for a state (for debugging)
     */
    getLastValue(stateId: string): string | undefined {
        return this.stateValues.get(stateId);
    }
}

// Export singleton instance
export const stateManager = new StateManager();
