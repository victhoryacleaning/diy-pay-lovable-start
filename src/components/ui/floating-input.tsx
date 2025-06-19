
import * as React from "react";
import { cn } from "@/lib/utils";
import InputMask from "react-input-mask";

interface FloatingInputProps extends React.ComponentProps<"input"> {
  label: string;
  id?: string;
  error?: boolean;
}

const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ className, label, id, error, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);

    const inputId = id || React.useId();
    const isFloating = focused || hasValue || (props.value && String(props.value).length > 0);

    React.useEffect(() => {
      setHasValue(props.value ? String(props.value).length > 0 : false);
    }, [props.value]);

    return (
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "peer h-12 w-full rounded-md border border-gray-300 bg-background px-3 pt-4 pb-2 text-sm ring-offset-background placeholder:text-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500",
            className
          )}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "absolute left-3 text-gray-600 transition-all duration-200 ease-in-out pointer-events-none",
            isFloating
              ? "top-1 text-xs font-medium text-blue-600"
              : "top-3 text-sm",
            error && isFloating && "text-red-600"
          )}
        >
          {label}
        </label>
      </div>
    );
  }
);

FloatingInput.displayName = "FloatingInput";

interface FloatingInputMaskProps extends React.ComponentProps<typeof InputMask> {
  label: string;
  id?: string;
  error?: boolean;
  className?: string;
}

const FloatingInputMask = React.forwardRef<any, FloatingInputMaskProps>(
  ({ className, label, id, error, ...props }, ref) => {
    const [focused, setFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(false);

    const inputId = id || React.useId();
    const isFloating = focused || hasValue || (props.value && String(props.value).length > 0);

    React.useEffect(() => {
      setHasValue(props.value ? String(props.value).length > 0 : false);
    }, [props.value]);

    return (
      <div className="relative">
        <InputMask
          ref={ref}
          id={inputId}
          className={cn(
            "peer h-12 w-full rounded-md border border-gray-300 bg-background px-3 pt-4 pb-2 text-sm ring-offset-background placeholder:text-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-0 focus-visible:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500",
            className
          )}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        <label
          htmlFor={inputId}
          className={cn(
            "absolute left-3 text-gray-600 transition-all duration-200 ease-in-out pointer-events-none",
            isFloating
              ? "top-1 text-xs font-medium text-blue-600"
              : "top-3 text-sm",
            error && isFloating && "text-red-600"
          )}
        >
          {label}
        </label>
      </div>
    );
  }
);

FloatingInputMask.displayName = "FloatingInputMask";

export { FloatingInput, FloatingInputMask };
