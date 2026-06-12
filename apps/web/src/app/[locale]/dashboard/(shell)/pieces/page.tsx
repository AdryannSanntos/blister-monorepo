import { redirect } from "next/navigation";

export default function PiecesRedirectPage() {
  redirect("/dashboard/history");
}
