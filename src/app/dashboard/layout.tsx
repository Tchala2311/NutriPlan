import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: { user } } = await getUser();

  if (!user) {
    redirect("/login");
  }

  // Gate dashboard until onboarding is complete
  const supabase = await createClient();
  const { data: assessment } = await supabase
    .from("health_assessments")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!assessment) {
    redirect("/onboarding?from=dashboard");
  }

  const email = user.email ?? "";
  const avatarUrl = user.user_metadata?.avatar_url ?? null;

  return (
    <DashboardShell userEmail={email} userAvatarUrl={avatarUrl}>
      {children}
    </DashboardShell>
  );
}
