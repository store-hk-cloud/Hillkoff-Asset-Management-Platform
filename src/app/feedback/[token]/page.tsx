import { ServiceFeedbackForm } from "@/features/service-jobs/components/service-feedback-form";

export default async function PublicFeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="bg-background mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
      <ServiceFeedbackForm token={token} />
    </main>
  );
}
