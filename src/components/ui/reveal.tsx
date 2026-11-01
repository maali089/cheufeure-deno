"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/** Sanfter Texteingang beim Scrollen (einmalig). */
export function Reveal({ children, delay = 0, y = 26, className, as = "div" }: { children: ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "li" | "article" }) {
  const reduce = useReducedMotion();
  const Comp = as === "li" ? motion.li : as === "article" ? motion.article : motion.div;
  return (
    <Comp
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -12% 0px" }}
      transition={{ duration: 1.1, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </Comp>
  );
}

/** Bildenthüllung: Fahrzeug tritt aus dem Schatten hervor. */
export function ShadowReveal({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0.25, filter: "brightness(0.25)", clipPath: "inset(0 0 0 18%)" }}
      whileInView={{ opacity: 1, filter: "brightness(1)", clipPath: "inset(0 0 0 0%)" }}
      viewport={{ once: true, margin: "0px 0px -18% 0px" }}
      transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
