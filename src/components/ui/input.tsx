import * as React from "react"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, value, onChange, ...props }, ref) => {
    // Enhanced sanitization for input values
    const sanitizeValue = (val: string | number | readonly string[] | undefined): string => {
      if (typeof val !== 'string') return val?.toString() || '';
      
      // Basic XSS prevention
      return val
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        // Create a new event with sanitized value for text inputs
        if (type === 'text' || type === 'email' || !type) {
          const sanitizedValue = sanitizeValue(e.target.value);
          const newEvent = {
            ...e,
            target: {
              ...e.target,
              value: sanitizedValue
            }
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(newEvent);
        } else {
          // For other input types (number, password, etc.), pass through unchanged
          onChange(e);
        }
      }
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        value={value}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
