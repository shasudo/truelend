import {
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "./cx";

const fieldBase =
  "min-w-0 w-full rounded-lg border border-navy-800/20 bg-white text-[0.95rem] text-navy-950 " +
  "placeholder:text-muted transition-colors focus:border-navy-800 focus:outline-none " +
  "focus:ring-2 focus:ring-navy-800/10 aria-invalid:border-red-600 aria-invalid:ring-red-600/10 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(fieldBase, "h-11 px-3.5", className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cx(fieldBase, "min-h-28 px-3.5 py-2.5 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <span className="relative block">
      <select className={cx(fieldBase, "h-11 appearance-none px-3.5 pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      />
    </span>
  );
}

export function Checkbox({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cx("mt-1 h-4 w-4 shrink-0 rounded accent-red-600", className)}
      {...props}
    />
  );
}

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, required, error, children, className }: FieldProps) {
  // Link the error text to the control (Input/Select/Textarea all spread props
  // onto the real element) and mark it invalid so screen readers announce both.
  const errorId = error && htmlFor ? `${htmlFor}-error` : undefined;
  const control =
    errorId && isValidElement(children)
      ? (() => {
          const child = children as ReactElement<{
            "aria-describedby"?: string;
            "aria-invalid"?: boolean;
          }>;
          const describedBy = [child.props["aria-describedby"], errorId].filter(Boolean).join(" ");
          return cloneElement(child, { "aria-describedby": describedBy, "aria-invalid": true });
        })()
      : children;

  return (
    <div className={cx("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-navy-800">
        {label}
        {required && (
          <>
            <span aria-hidden className="text-red-600">
              {" "}
              *
            </span>
            {/* The asterisk is decorative; give SR users the word. */}
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
