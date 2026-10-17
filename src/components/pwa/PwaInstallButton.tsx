"use client";

import React from "react";

interface PwaInstallButtonProps {
  variant?: "full" | "compact";
  className?: string;
}

export function PwaInstallButton({ variant = "full", className = "" }: PwaInstallButtonProps) {
  // Completely removed from UI per user specification
  return null;
}
