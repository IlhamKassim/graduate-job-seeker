import { ProfileForm } from '@/components/ProfileForm';
import { YearPreview } from '@/components/YearPreview';
import { DATA_SLICE } from '@/lib/config';

export default function LandingPage() {
  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 sm:px-6">
      <section className="grid grid-cols-1 gap-8 pb-10 pt-8 lg:grid-cols-[minmax(0,1fr)_26rem] lg:gap-14 lg:pb-14 lg:pt-12">
        <div className="max-w-[34ch] lg:max-w-none">
          <h1 className="text-[2rem] font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:text-[2.75rem] lg:text-[3.25rem]">
            Which programmes are open to you, and when they close.
          </h1>

          <div className="mt-5 max-w-[58ch] space-y-3 text-[1.0625rem] leading-relaxed text-ink-80">
            <p>
              Graduate programmes in Malaysia and Singapore sit on separate careers pages, each
              with its own window and eligibility bar. You usually find out you were never
              eligible, or that the window shut in March, after you have already spent an
              evening on it.
            </p>
            <p>
              Answer seven questions once. The default shortlist is a Malaysia slice checked
              against employer pages. Samples stay hidden until you ask.
            </p>
          </div>
        </div>

        <div className="lg:pt-2">
          <YearPreview />
        </div>
      </section>

      <section aria-labelledby="form-heading" className="pb-4">
        <div className="rule-heavy flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-2">
          <h2
            id="form-heading"
            className="text-[1.25rem] font-semibold tracking-[-0.02em] text-ink sm:text-[1.5rem]"
          >
            Your profile
          </h2>
          <p className="font-mono text-[0.75rem] text-slate">
            7 questions · one screen · {DATA_SLICE.verifiedCount} checked programmes
          </p>
        </div>

        <div className="max-w-[56rem]">
          <ProfileForm />
        </div>
      </section>
    </div>
  );
}
