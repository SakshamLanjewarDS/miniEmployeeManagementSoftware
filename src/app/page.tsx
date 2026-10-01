import { redirect } from "next/navigation";

export default function RootPage() {
  // Default customer organization is 100% DESIGN Studio
  redirect("/w/100percentdesign/login");
}
