import { UsersManager } from "@/components/admin/users-manager";
import { getAdminDirectoryPage } from "@/lib/admin-user-directory";

export default async function AdminLearnersPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const directory = await getAdminDirectoryPage("learners", params).catch((error) => {
    console.error(
      "[database] admin learners query failed. Returning a safe fallback while the database catches up.",
      error
    );
    return {
      mode: "learners" as const,
      filters: {
        page: 1,
        pageSize: 20,
        search: "",
        role: "all" as const,
        plan: "all" as const,
        progress: "all" as const,
        country: "",
        joinedFrom: "",
        joinedTo: "",
        sort: "joined",
      },
      users: [],
      total: 0,
      pageCount: 1,
      countries: [],
    };
  });

  return (
    <UsersManager
      mode="learners"
      title="Learners"
      description="Review learner profiles, enrollments, subscriptions, and payment history from one focused workspace."
      resultLabel="learners"
      users={directory.users}
      filters={directory.filters}
      total={directory.total}
      pageCount={directory.pageCount}
      countries={directory.countries}
    />
  );
}
