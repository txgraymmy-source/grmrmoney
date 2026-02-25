import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-[46px] w-full rounded-[12px] border border-[rgba(120,120,128,0.2)] bg-[rgba(118,118,128,0.12)] px-4 py-2 text-[15px] text-white placeholder:text-white/40 focus-visible:outline-none focus-visible:border-[rgba(120,120,128,0.4)] focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
