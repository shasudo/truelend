/**
 * `notice` reports a non-fatal problem on an action that otherwise succeeded —
 * today, a notification email the operator should retry. It never means the
 * mutation failed, so it renders alongside success rather than as an error.
 */
export type ActionResult = { ok?: boolean; error?: string; uncertain?: boolean; notice?: string };
