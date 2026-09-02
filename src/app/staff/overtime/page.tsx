import { redirect } from "next/navigation";

export default function StaffOvertimeRedirectPage() {
  redirect("/staff/timesheets?tab=overtime");
}
