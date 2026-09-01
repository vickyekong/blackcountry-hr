import { redirect } from "next/navigation";

/** Legacy path — staff portal lives at /staff. */
export default function MyPortalRedirect() {
  redirect("/staff");
}
