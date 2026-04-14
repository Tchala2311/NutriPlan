import { redirect } from "next/navigation";

// Root redirects to the main app; middleware handles auth gate
export default function RootPage() {
  redirect("/dashboard");
}
