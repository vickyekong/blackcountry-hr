import { redirect } from "next/navigation";

export default function AttendanceRedirectPage({
  searchParams,
}: {
  searchParams: { tab?: string };
}) {
  if (searchParams.tab === "overtime") {
    redirect("/timesheets?tab=overtime");
  }
  if (searchParams.tab === "holidays") {
    redirect("/timesheets?tab=holidays");
  }
  if (searchParams.tab === "roster" || searchParams.tab === "exceptions") {
    redirect("/timesheets?tab=roster");
  }
  redirect("/timesheets?tab=clock");
}
