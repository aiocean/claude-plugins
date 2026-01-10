import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";

export { default as Button } from "./Button.vue";

export const buttonVariants = cva(
	"inline-flex items-center justify-center whitespace-nowrap rounded-base text-sm font-base ring-offset-white transition-all gap-2 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
	{
		variants: {
			variant: {
				default:
					"text-main-foreground bg-main border-3 border-border shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none hover:text-main-foreground",
				noShadow: "text-main-foreground bg-main border-3 border-border hover:text-main-foreground",
				neutral:
					"bg-secondary-background text-foreground border-3 border-border shadow-shadow hover:translate-x-boxShadowX hover:translate-y-boxShadowY hover:shadow-none hover:text-foreground",
				reverse:
					"text-main-foreground bg-main border-3 border-border hover:translate-x-reverseBoxShadowX hover:translate-y-reverseBoxShadowY hover:shadow-shadow hover:text-main-foreground",
				ghost: "text-foreground hover:text-foreground hover:bg-secondary",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-9 px-3",
				lg: "h-11 px-8",
				icon: "size-10",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
