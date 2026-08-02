import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

import { Label } from "@/components/ui/label";

type FormControlProps = {
  readonly "aria-describedby"?: string;
  readonly "aria-invalid"?: boolean;
};

type FormFieldProps = Readonly<{
  htmlFor: string;
  label: ReactNode;
  required?: boolean;
  error?: string | undefined;
  children: ReactElement<FormControlProps>;
}>;

export function FormField({
  htmlFor,
  label,
  required = false,
  error,
  children,
}: FormFieldProps) {
  const errorId = `${htmlFor}-error`;
  const controlProps: FormControlProps = error
    ? { "aria-describedby": errorId, "aria-invalid": true }
    : {};
  const control = isValidElement<FormControlProps>(children)
    ? cloneElement(children, controlProps)
    : children;

  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? (
          <span aria-hidden="true" className="text-destructive ml-1">
            *
          </span>
        ) : null}
      </Label>
      {control}
      {error ? (
        <p className="text-destructive text-sm" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
