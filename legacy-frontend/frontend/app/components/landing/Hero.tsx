import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useApiData() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/v1/services');
        if (!response.ok) {
          throw new Error('Failed to fetch services');
        }
        const data = await response.json();
        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return { data, loading, error };
}

export default function Hero() {
  const { data, loading, error } = useApiData();
  
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative text-navy-950 dark:text-[#eef6f4]"
    >
      <div className="relative mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12 xl:px-20">
        {/* Section masthead */}
        <div className="flex items-center justify-between gap-4 rounded-full border border-white/60 bg-white/50 px-4 py-2.5 shadow-[0_8px_32px_-16px_rgba(0,18,25,0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_8px_32px_-16px_rgba(0,0,0,0.7)]">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-[3px] w-6 bg-teal-600 dark:bg-teal-300"
            />
            <span className="text-[10px] font-medium tracking-[0.16em] sm:text-[11px]">
              CAR WASH BOOKING
            </span>
          </div>
          
          <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
            <MapPin
              aria-hidden="true"
              className="size-3.5 text-teal-600 dark:text-teal-300"
            />
            Accra, Ghana
          </div>
        </div>
        
        {/* Main hero */}
        <div className="grid items-center gap-12 py-12 md:py-14 lg:grid-cols-[1fr_1.05fr] lg:gap-12 lg:py-10">
          <div>
            <h1
              id="hero-heading"
              className="text-[clamp(2.75rem,5.3vw,4.75rem)] leading-[1.08] font-display font-semibold tracking-[-0.055em]"
            >
              <span className="block">Find a wash.</span>
              <span className="block">Book the slot.</span>
              <span className="block text-teal-600 dark:text-teal-300">
                <TypewriterText phrases={['Drive clean.', 'Shine brighter.', 'Go further.']} />
              </span>
            </h1>
            
            <p className="mt-6 max-w-lg text-base leading-[1.65] text-[#586c70] dark:text-[#a9bfc4] xl:text-lg">
              Compare trusted car wash partners in Accra, see prices before you book, and lock a time that fits your day.
            </p>
            
            <Link
              href="/search"
              className="group mt-8 inline-flex min-h-[60px] items-center justify-center gap-7 rounded-lg bg-teal-600 px-6 py-4 text-base font-semibold text-white shadow-[0_12px_32px_-12px_rgba(10,147,150,0.65)] transition-colors hover:bg-navy-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600 dark:bg-teal-400 dark:text-navy-950 dark:shadow-[0_12px_32px_-12px_rgba(61,180,186,0.45)] dark:hover:bg-teal-300 dark:focus-visible:outline-teal-300"
            >
              Find a car wash
              <ArrowRight
                aria-hidden="true"
                className="size-5 transition-transform group-hover:translate-x-1 motion-reduce:transform-none"
              />
            </Link>
            
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-3">
              {['Verified partners', 'Prices up front', 'No phone calls'].map((promise) => (
                <li
                  key={promise}
                  className="flex items-center gap-2 text-[13px] font-medium"
                >
                  <Check
                    aria-hidden="true"
                    className="size-4 shrink-0 text-teal-600 dark:text-teal-300"
                    strokeWidth={2}
                  />
                  {promise}
                </li>
              ))}
            </ul>
            
            <div className="mt-12">
              <div className="mb-6 flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-label font-semibold uppercase tracking-[0.1em] text-teal-600 dark:text-teal-300">
                  <span
                    aria-hidden="true"
                    className="h-px w-5 bg-teal-600 dark:bg-teal-300"
                  />
                  Available Services
                </p>
                <p className="font-mono text-caption text-muted-foreground dark:text-sand-300">
                  From {data ? data.length : 0} options
                </p>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/55 shadow-[0_20px_56px_-32px_rgba(0,18,25,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_20px_56px_-32px_rgba(0,0,0,0.8)]">
                <div className="grid divide-y divide-white/60 sm:grid-cols-2 sm:divide-x sm:divide-y-0 dark:divide-white/10">
                  {data && data.map((service, index) => (
                    <article key={service.slug} className="group flex h-full flex-col gap-6 px-5 py-6 sm:px-6 sm:py-8">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-mono text-caption font-medium text-muted-foreground dark:text-sand-300">
                          0{index + 1}
                        </span>
                        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/65 text-teal-600 shadow-[0_8px_24px_-16px_rgba(0,18,25,0.4)] backdrop-blur-xl transition-colors duration-300 group-hover:border-teal-600/30 group-hover:bg-white/85 dark:border-white/10 dark:bg-white/[0.06] dark:text-teal-300 dark:group-hover:border-teal-300/30 dark:group-hover:bg-white/10">
                          <span className="h-6 w-6 bg-teal-600 dark:bg-teal-300 rounded-full"></span>
                        </span>
                      </div>

                      <div>
                        <p className="font-display text-title font-bold tracking-tight text-foreground text-pretty dark:text-sand-50">
                          {service.title}
                        </p>
                        <p className="mt-2 max-w-xs text-caption text-muted-foreground dark:text-sand-300">
                          {service.copy}
                        </p>
                        <p className="mt-4 text-lg font-bold text-teal-600 dark:text-teal-300">
                          Starting at ${service.fromPrice}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}