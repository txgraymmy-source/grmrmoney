import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[14px] text-[15px] font-medium transition-opacity focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        // Акцентная — лавандовая #d6d3ff
        default: "bg-[#d6d3ff] text-[#090909] hover:opacity-90 shadow-[inset_0px_-1px_1px_0px_rgba(16,16,18,0.12)]",
        // Деструктивная — красная
        destructive: "bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30",
        // С обводкой
        outline: "border border-[rgba(120,120,128,0.2)] text-white hover:bg-white/[0.06]",
        // Вторичная — ghost с подложкой
        secondary: "bg-[rgba(118,118,128,0.12)] text-white hover:opacity-80",
        // Ghost — без фона
        ghost: "text-white/70 hover:bg-white/[0.06] hover:text-white",
        // Ссылка
        link: "text-[#d6d3ff] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[46px] px-5 py-2",
        sm: "h-9 px-4 text-sm rounded-[12px]",
        lg: "h-[52px] px-6",
        icon: "h-10 w-10 rounded-[12px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
