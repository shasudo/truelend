"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";

export interface SubmitButtonProps extends Omit<ButtonProps, "asChild"> {
  /** Label shown while the enclosing form's action is in flight. */
  pendingText?: string;
  /** If set, window.confirm() this before submitting; cancel aborts the submit. */
  confirm?: string;
}

/**
 * Submit button for `<form action={serverAction}>`. Reads the parent form's
 * pending state via useFormStatus, so it disables + relabels itself while the
 * action runs — preventing the double-submits that duplicated writes. Must be a
 * child of the form (not the component rendering it).
 */
export function SubmitButton({
  children,
  pendingText = "Saving…",
  confirm,
  disabled,
  onClick,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...props}
    >
      {pending ? pendingText : children}
    </Button>
  );
}
