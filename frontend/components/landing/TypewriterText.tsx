"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";

type TypewriterTextProps = {
  phrases: readonly string[];
  typeSpeed?: number;
  deleteSpeed?: number;
  holdDuration?: number;
};

export function TypewriterText({
  phrases,
  typeSpeed = 70,
  deleteSpeed = 35,
  holdDuration = 1600,
}: TypewriterTextProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const current = phrases[index % phrases.length];

  useEffect(() => {
    if (reduceMotion || !current) {
      if (phrases[0]) setText(phrases[0]);
      return;
    }

    if (!deleting && text === current) {
      const timeout = window.setTimeout(() => setDeleting(true), holdDuration);
      return () => window.clearTimeout(timeout);
    }

    if (deleting && text.length === 0) {
      setDeleting(false);
      setIndex((value) => (value + 1) % phrases.length);
      return;
    }

    const timeout = window.setTimeout(
      () => {
        setText((value) =>
          deleting
            ? current.slice(0, value.length - 1)
            : current.slice(0, value.length + 1),
        );
      },
      deleting ? deleteSpeed : typeSpeed,
    );

    return () => window.clearTimeout(timeout);
  }, [
    current,
    deleteSpeed,
    deleting,
    holdDuration,
    phrases,
    reduceMotion,
    text,
    typeSpeed,
  ]);

  const visibleText = reduceMotion ? phrases[0] : text;

  return (
    <>
      <span className="sr-only">{phrases[0]}</span>
      <span aria-hidden="true" className="inline-grid align-bottom">
        {phrases.map((phrase) => (
          <span
            key={phrase}
            className="invisible col-start-1 row-start-1 whitespace-nowrap"
          >
            {phrase}
          </span>
        ))}
        <span className="col-start-1 row-start-1 whitespace-nowrap">
          <span className="relative block w-max">
            {visibleText}
            {!reduceMotion && (
              <span className="typewriter-caret absolute top-1/2 left-full ml-[0.06em] h-[0.78em] w-[0.06em] -translate-y-1/2 bg-current" />
            )}
          </span>
        </span>
      </span>
    </>
  );
}
