"use client";

import React from "react";
import { useParams } from "next/navigation";
import SiteIssuesView from "../SiteIssuesView";

export default function SiteIssueTrackingPage() {
  const params = useParams();
  const workspaceSlug = (params?.workspaceSlug as string) || "100percentdesign";

  return (
    <div className="space-y-6">
      <SiteIssuesView workspaceSlug={workspaceSlug} />
    </div>
  );
}
