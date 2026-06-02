import { MfaChallenge } from "@/components/account/mfa-challenge";

export default async function MfaPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/account";

  return (
    <section className="container-page max-w-md py-16">
      <MfaChallenge next={safeNext} />
    </section>
  );
}
