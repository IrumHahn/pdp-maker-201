import * as React from "react";

import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, type, ...props }, ref) => {
  return (
    <input
      className={cn(
        "flex h-12 w-full rounded-full border border-border bg-[rgba(255,255,255,0.76)] px-5 py-3 text-sm text-foreground outline-none transition-colors duration-300 placeholder:text-muted/80 focus:border-primary/40 focus:bg-white",
        className
      )}
      type={type}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };
