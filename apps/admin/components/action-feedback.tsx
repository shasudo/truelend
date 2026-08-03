import type { ActionResult } from "@/lib/action-result";

interface ActionFeedbackProps {
  state: ActionResult;
  /** Omit on a form that redirects on success and so never renders one. */
  success?: string;
}

/**
 * The one renderer for a server action's outcome. `notice` reports a non-fatal
 * problem on an action that otherwise succeeded, so it renders in place of the
 * success line rather than as an error.
 */
export function ActionFeedback({ state, success }: ActionFeedbackProps) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {state.error}
      </p>
    );
  }
  if (state.ok && (state.notice || success)) {
    return (
      <p
        role="status"
        className={
          state.notice
            ? "mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            : "mt-2 text-sm text-navy-700"
        }
      >
        {state.notice ?? success}
      </p>
    );
  }
  return null;
}
