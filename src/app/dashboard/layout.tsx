import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const email = user.email ?? "";
  const avatarUrl = user.user_metadata?.avatar_url ?? null;

  return (
    <DashboardShell userEmail={email} userAvatarUrl={avatarUrl}>
      {children}
    </DashboardShell>
  );
}
