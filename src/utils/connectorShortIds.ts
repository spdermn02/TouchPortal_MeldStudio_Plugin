/**
 * TouchPortal shortIds for connector instances, keyed by full connectorId.
 * TP sends these at plugin connect (before Meld is ready), so the listener lives in index.ts
 * and survives action teardown. Required when a full connectorId exceeds 200 characters.
 */
export const connectorShortIds: Map<string, string> = new Map();
