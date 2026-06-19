import { redirect } from "next/navigation";

import { getCurrentSession } from "@/lib/auth/dal";
import { DEFAULT_AUTHENTICATED_ROUTE, LOGIN_ROUTE } from "@/lib/constants";

export default async function HomePage() {
  const session = await getCurrentSession();
  redirect(session ? DEFAULT_AUTHENTICATED_ROUTE : LOGIN_ROUTE);
}
