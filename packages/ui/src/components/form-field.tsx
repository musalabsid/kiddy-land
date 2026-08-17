import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Shared form field wrapper: visible label with required (*) indicator,
 * optional marker, and inline error text. Mirrors shadcn FieldGroup + Field
 * semantics using semantic tokens, data-invalid and aria-invalid.
 */
export function FormField({
  label,
  required = false,
  optional = true,
  error,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const showOptional = !required && optional;
  return (
    <div className={cn("grid gap-1.5", className)} data-invalid={error ? "" : undefined}>
      <label
        htmlFor={htmlFor}
        className="flex items-baseline gap-1 text-sm font-medium text-foreground"
      >
        <span>{label}</span>
        {required ? (
          <span aria-hidden="true" className="text-destructive">*</span>
        ) : null}
        {showOptional ? (
          <span className="text-xs font-normal text-muted-foreground">(optional)</span>
        ) : null}
      </label>
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean }>, {
            "aria-invalid": error ? true : undefined,
            "aria-describedby": error && htmlFor ? `${htmlFor}-error` : undefined,
          })
        : children}
      {hint && !error ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {error ? (
        <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-xs text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
