import type { ReactNode } from "react";

type HeroBackdropProps = {
  children: ReactNode;
};

export function HeroBackdrop({ children }: HeroBackdropProps) {
  return (
    <div className="relative isolate overflow-hidden border-b border-[#d9e2df] bg-[#fafaf6] dark:border-white/10 dark:bg-[#06171d]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage:
              "radial-gradient(58% 42% at 50% 34%, rgba(255,255,255,0.52), rgba(255,255,255,0.2) 46%, transparent 74%), radial-gradient(110% 100% at 0% 0%, rgba(10,147,150,0.3), rgba(10,147,150,0.12) 34%, transparent 62%), radial-gradient(90% 80% at 100% 0%, rgba(238,155,0,0.15), rgba(238,155,0,0.05) 38%, transparent 66%), linear-gradient(120deg, #e6f2ee 0%, #f2f4ea 35%, #f8f5ec 68%, #f3efe5 100%)",
          }}
        />
        <div className="absolute -left-28 top-10 size-[26rem] rounded-full bg-teal-300/35 blur-3xl dark:bg-teal-500/15" />
        <div className="absolute -right-24 top-1/4 size-[30rem] rounded-full bg-gold-300/18 blur-3xl dark:bg-gold-500/10" />
        <div className="absolute -bottom-28 -left-24 size-[24rem] rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-400/10" />
        <div className="absolute right-1/3 top-0 h-40 w-[28rem] -translate-y-1/2 rounded-full bg-white/70 blur-3xl dark:bg-white/[0.03]" />
        <div className="absolute inset-0 bg-white/15 dark:hidden" />
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}
