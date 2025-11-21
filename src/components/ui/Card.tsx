'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const cardVariants = cva(
  "rounded-xl border bg-card text-card-foreground shadow-sm transition-all duration-300",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "border-border shadow-lg",
        outlined: "border-2 border-border",
        ghost: "border-transparent shadow-none",
      },
      padding: {
        none: "",
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
      hover: {
        none: "",
        lift: "hover:shadow-lg hover:-translate-y-1",
        glow: "hover:shadow-lg hover:border-primary/30",
        scale: "hover:scale-[1.02]",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "md",
      hover: "none",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, hover, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, hover, className }))}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 pb-4", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("font-serif text-xl font-semibold leading-none tracking-tight", className)}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground leading-relaxed", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center pt-4 border-t border-border", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

// Enhanced Card variants for specific use cases
const ProjectCard = React.forwardRef<
  HTMLDivElement,
  CardProps & {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    stats?: React.ReactNode;
    actions?: React.ReactNode;
    onClick?: () => void;
  }
>(({ title, description, icon, stats, actions, onClick, className, ...props }, ref) => (
  <Card
    ref={ref}
    variant="default"
    hover="lift"
    className={cn(
      "group cursor-pointer animate-fade-in-up",
      onClick && "hover:border-primary/30",
      className
    )}
    onClick={onClick}
    {...props}
  >
    <CardHeader>
      <div className="flex items-start justify-between">
        {icon && (
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            {icon}
          </div>
        )}
        {actions && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            {actions}
          </div>
        )}
      </div>
      <CardTitle className="line-clamp-1">{title}</CardTitle>
      {description && (
        <CardDescription className="line-clamp-2">{description}</CardDescription>
      )}
    </CardHeader>
    {stats && (
      <CardFooter className="text-xs text-muted-foreground">
        {stats}
      </CardFooter>
    )}
  </Card>
));
ProjectCard.displayName = "ProjectCard";

const FeatureCard = React.forwardRef<
  HTMLDivElement,
  CardProps & {
    title: string;
    description: string;
    icon?: React.ReactNode;
    features?: string[];
  }
>(({ title, description, icon, features, className, ...props }, ref) => (
  <Card
    ref={ref}
    variant="default"
    hover="glow"
    className={cn("group text-center", className)}
    {...props}
  >
    <CardHeader>
      {icon && (
        <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
          <div className="text-white">
            {icon}
          </div>
        </div>
      )}
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    {features && features.length > 0 && (
      <CardContent>
        <ul className="space-y-2 text-sm">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
    )}
  </Card>
));
FeatureCard.displayName = "FeatureCard";

const StatsCard = React.forwardRef<
  HTMLDivElement,
  CardProps & {
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    icon?: React.ReactNode;
  }
>(({ title, value, change, changeType = 'neutral', icon, className, ...props }, ref) => (
  <Card
    ref={ref}
    variant="default"
    className={cn("", className)}
    {...props}
  >
    <CardContent className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
        {change && (
          <p className={cn(
            "text-xs",
            changeType === 'positive' && "text-green-600",
            changeType === 'negative' && "text-red-600",
            changeType === 'neutral' && "text-muted-foreground"
          )}>
            {change}
          </p>
        )}
      </div>
      {icon && (
        <div className="h-8 w-8 text-muted-foreground">
          {icon}
        </div>
      )}
    </CardContent>
  </Card>
));
StatsCard.displayName = "StatsCard";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  ProjectCard,
  FeatureCard,
  StatsCard,
  cardVariants,
};