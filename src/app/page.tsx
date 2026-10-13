import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE_NAME } from "@/server/auth/session";

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    redirect("/w/100percentdesign/dashboard");
  }

  // Default customer organization is 100% DESIGN Studio
  redirect("/w/100percentdesign/login");
}
