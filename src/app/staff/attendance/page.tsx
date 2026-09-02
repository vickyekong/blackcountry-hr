import { redirect } from "next/navigation";

export default function StaffAttendanceRedirectPage() {
  redirect("/staff/timesheets");
}
