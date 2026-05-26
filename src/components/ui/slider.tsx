import * as SliderPrimitive from "@radix-ui/react-slider"
import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"

export function Slider({ className, ...props }: ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-divider">
        <SliderPrimitive.Range className="absolute h-full bg-accent" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-3 rounded-full bg-fg shadow-[0_1px_3px_rgb(0_0_0/0.4)] outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-accent" />
    </SliderPrimitive.Root>
  )
}
