import { redirect } from "next/navigation";

export default function BrandRedirectPage() {
  redirect("/dashboard/settings");
}
