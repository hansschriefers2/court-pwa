"use client";

import { useState } from "react";

interface FAQ {
  q: string;
  a: string;
}

export default function FAQAccordion({ faqs }: { faqs: FAQ[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <dl className="divide-y divide-gray-100">
      {faqs.map(({ q, a }, i) => (
        <div key={q}>
          <dt>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-semibold text-gray-900"
              aria-expanded={open === i}
            >
              <span>{q}</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={[
                  "h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200",
                  open === i ? "rotate-180" : "",
                ].join(" ")}
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </dt>
          {open === i && (
            <dd className="pb-4 text-sm text-gray-600 leading-relaxed">{a}</dd>
          )}
        </div>
      ))}
    </dl>
  );
}
