import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-lg text-card-foreground transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-white border border-gray-200 shadow-sm hover:shadow-md",
        elevated: "bg-white border border-gray-200 shadow-lg hover:shadow-xl",
        glass: "bg-white/80 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl hover:bg-white/90",
        gradient: "bg-gradient-to-br from-white via-purple-50/30 to-violet-50/30 border border-purple-200/50 shadow-lg hover:shadow-xl hover:from-white hover:via-purple-50/50 hover:to-violet-50/50",
        interactive: "bg-white border border-gray-200 shadow-sm hover:shadow-lg hover:scale-[1.02] cursor-pointer transition-transform",
      },
      padding: {
        none: "",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  hover?: boolean;
}

const EnhancedCard = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, hover, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        cardVariants({ variant, padding }),
        hover && "hover:shadow-lg hover:scale-[1.01] transition-all duration-300",
        className
      )}
      {...props}
    />
  )
);
EnhancedCard.displayName = "EnhancedCard";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { compact?: boolean }
>(({ className, compact, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex flex-col space-y-1.5",
      compact ? "p-4 pb-2" : "p-6 pb-4",
      className
    )}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { 
    size?: "sm" | "default" | "lg";
    gradient?: boolean;
  }
>(({ className, size = "default", gradient, ...props }, ref) => {
  const sizeClasses = {
    sm: "text-lg font-semibold",
    default: "text-xl font-semibold",
    lg: "text-2xl font-bold",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "leading-none tracking-tight",
        sizeClasses[size],
        gradient && "bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent",
        className
      )}
      {...props}
    />
  );
});
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { compact?: boolean }
>(({ className, compact, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      compact ? "p-4 pt-0" : "p-6 pt-0", 
      className
    )} 
    {...props} 
  />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { compact?: boolean }
>(({ className, compact, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center",
      compact ? "p-4 pt-0" : "p-6 pt-0",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export { 
  EnhancedCard, 
  CardHeader, 
  CardFooter, 
  CardTitle, 
  CardDescription, 
  CardContent,
  cardVariants 
};