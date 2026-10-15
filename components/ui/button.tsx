"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
// ShadCN-style composition, customized for the existing bakery design system.
export function Button({ asChild = false, variant = "default", className = "", type, ...props }: React.ComponentProps<"button"> & { asChild?: boolean; variant?: "default" | "secondary" }) {
  const Component = asChild ? Slot : "button";
  return <Component data-slot="button" type={asChild ? undefined : type ?? "button"} className={`button ${variant === "secondary" ? "secondary" : ""} ${className}`} {...props} />;
}
