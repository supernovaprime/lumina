type GridBackdropProps = {
  className?: string;
  glow?: "strong" | "soft" | "none";
};

export function GridBackdrop({ className, glow = "strong" }: GridBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ""}`}
    >
      <div className="grid-backdrop absolute inset-0 opacity-40 dark:opacity-30" />
      {glow !== "none" && (
        <div
          className={`absolute inset-0 ${
            glow === "strong" ? "grid-glow" : "grid-glow-soft"
          }`}
        />
      )}
    </div>
  );
}
