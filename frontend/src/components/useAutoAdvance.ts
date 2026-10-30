import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

// Auto-advances a horizontal scroll-snap carousel, one slide per `interval`.
// Moving content needs a way to stop it (WCAG 2.2.2), so it:
// - waits while the user is touching, scrolling or tabbing through it, and
//   only starts again after `idle` ms with no interaction
// - can be paused for good with the button (`paused` / `togglePaused`)
// - never runs for people who turned on reduced motion
// The swipe itself is plain CSS scroll-snap; this only moves the scroll
// position and reports which slide is showing.
export function useAutoAdvance(
  trackRef: RefObject<HTMLElement | null>,
  count: number,
  { interval = 6000, idle = 8000 } = {},
) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const lastInteraction = useRef(0);

  const scrollToSlide = useCallback(
    (i: number) => {
      const track = trackRef.current;
      if (!track) return;
      track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
    },
    [trackRef],
  );

  // Which slide is showing, from the scroll position. Covers swipes, the
  // dots and the timer alike.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onScroll = () =>
      setIndex(Math.round(track.scrollLeft / track.clientWidth));
    track.addEventListener("scroll", onScroll, { passive: true });
    return () => track.removeEventListener("scroll", onScroll);
  }, [trackRef, count]);

  // Any sign of a person using the carousel holds off the timer. These are
  // input events rather than "scroll", because the timer's own scrolling
  // fires "scroll" too.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const markInteraction = () => {
      lastInteraction.current = Date.now();
    };
    const events = ["pointerdown", "wheel", "keydown", "focusin"] as const;
    for (const e of events) track.addEventListener(e, markInteraction);
    return () => {
      for (const e of events) track.removeEventListener(e, markInteraction);
    };
  }, [trackRef, count]);

  useEffect(() => {
    if (paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = setInterval(() => {
      if (Date.now() - lastInteraction.current < idle) return;
      // Loops back to the first slide after the last.
      scrollToSlide((index + 1) % count);
    }, interval);
    return () => clearInterval(timer);
  }, [paused, count, index, interval, idle, scrollToSlide]);

  return {
    index,
    // For the dots: picking a slide counts as interaction too.
    goTo: (i: number) => {
      lastInteraction.current = Date.now();
      scrollToSlide(i);
    },
    paused,
    togglePaused: () => setPaused((p) => !p),
  };
}
