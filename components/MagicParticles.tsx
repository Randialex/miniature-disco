"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const particles = [
  [8, 14, 18, 0], [18, 72, 23, 4], [29, 34, 20, 8], [39, 84, 27, 2],
  [52, 18, 25, 11], [63, 66, 19, 6], [73, 41, 28, 13], [84, 79, 22, 5],
  [93, 25, 26, 9], [12, 91, 29, 14], [46, 53, 24, 7], [78, 7, 21, 3],
];

export default function MagicParticles() {
  const pathname = usePathname();
  const [transitioning, setTransitioning] = useState(false);
  useEffect(() => {
    setTransitioning(true);
    const timer = window.setTimeout(() => setTransitioning(false), 500);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  return <><div className="magic-particles" aria-hidden="true">{particles.map(([left, top, duration, delay], index) => <i key={index} style={{ left: `${left}%`, top: `${top}%`, animationDuration: `${duration}s`, animationDelay: `-${delay}s` }} />)}</div><div className={`route-mist${transitioning ? " route-mist--active" : ""}`} aria-hidden="true" /></>;
}
