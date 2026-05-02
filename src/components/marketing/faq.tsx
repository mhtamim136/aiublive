"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "Do I need my AIUB portal password?",
    a: "Never. AIUB Live is independent — we only ask for your AIUB student ID format (e.g. 22-12345-1) for community verification. We don't connect to the portal, scrape it, or store any portal credentials.",
  },
  {
    q: "Is this an official AIUB platform?",
    a: "No. AIUB Live is a student-built product designed for the AIUB community. It is not affiliated with, endorsed by, or operated by the university.",
  },
  {
    q: "Who can see my profile?",
    a: "Only verified AIUB students. Within that, you control what's visible — your bio, current courses, skills, projects. You can keep your courses private from your settings.",
  },
  {
    q: "How do connections and DMs work?",
    a: "Send a connection request first. Once accepted, DMs unlock between you two. There are no public posts, no random DMs, and no algorithmic feed begging for attention.",
  },
  {
    q: "I'm a senior — how is this different from LinkedIn?",
    a: "LinkedIn is for professional life beyond campus. AIUB Live is built around what's actually happening *on* campus right now — your current courses, who's in them, who's looking for project teammates this semester.",
  },
];

export function FAQ() {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <section id="faq" className="border-t border-border py-20 md:py-28">
      <div className="container max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Honest answers
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight md:text-5xl">
            The questions{" "}
            <span className="gradient-text">everyone asks</span>.
          </h2>
        </motion.div>

        <div className="mt-12 divide-y divide-border rounded-3xl border border-border bg-card">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-muted/30"
                >
                  <span className="text-base font-medium">{f.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300",
                      isOpen && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{
                        duration: 0.32,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                        {f.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
