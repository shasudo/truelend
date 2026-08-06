"use client";

interface SelectAllCheckboxProps {
  /** The `name` shared by every row checkbox this should toggle, e.g. "taskIds". */
  name: string;
}

/**
 * Toggles every same-named checkbox in the enclosing form. Lives outside the
 * form's own client component so the table itself can stay server-rendered —
 * this just reaches for its closest <form> at click time rather than needing
 * the row data lifted into client state.
 */
export function SelectAllCheckbox({ name }: SelectAllCheckboxProps) {
  return (
    <input
      type="checkbox"
      aria-label="Select all"
      // Lets an enclosing client form find this box and keep it (and its
      // indeterminate state) in step with a selection made elsewhere.
      data-select-all={name}
      onChange={(event) => {
        const checked = event.currentTarget.checked;
        event.currentTarget
          .closest("form")
          ?.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="${name}"]`)
          .forEach((box) => {
            box.checked = checked;
          });
      }}
    />
  );
}
