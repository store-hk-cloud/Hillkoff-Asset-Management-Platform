import { ServiceFeedbackForm } from "@/features/service-jobs/components/service-feedback-form";

export default async function PublicFeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center bg-slate-50 px-4 py-10">
      <ServiceFeedbackForm token={token} />
    </main>
  );
}
