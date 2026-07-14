'use client';

import { FormEvent, useState } from 'react';
import { SITE } from '@/lib/site';

type Props = {
  intent?: string;
  title: string;
  submitLabel?: string;
};

export function LeadForm({ intent = 'general', title, submitLabel = 'Submit' }: Props) {
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      intent,
      name: String(fd.get('name') || ''),
      email: String(fd.get('email') || ''),
      company: String(fd.get('company') || ''),
      role: String(fd.get('role') || ''),
      message: String(fd.get('message') || ''),
    };

    // Analytics hook
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('azi-lead', { detail: payload }));
      const w = window as Window & { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ event: 'demo_request', ...payload });
    }

    const body = encodeURIComponent(
      `Intent: ${intent}\nName: ${payload.name}\nEmail: ${payload.email}\nCompany: ${payload.company}\nRole: ${payload.role}\n\n${payload.message}`,
    );
    const subject = encodeURIComponent(`[${SITE.name}] ${title}`);
    try {
      window.location.href = `mailto:${SITE.demoEmail}?subject=${subject}&body=${body}`;
      setStatus('sent');
    } catch {
      setStatus('error');
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4" noValidate>
      <input type="hidden" name="intent" value={intent} />
      <div>
        <label htmlFor="name" className="text-sm font-medium">
          Full name
        </label>
        <input
          id="name"
          name="name"
          required
          autoComplete="name"
          className="mt-1 w-full rounded-md border border-paper-line bg-paper-elev px-3 py-2 text-sm dark:border-ink-muted dark:bg-ink-soft"
        />
      </div>
      <div>
        <label htmlFor="email" className="text-sm font-medium">
          Work email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-paper-line bg-paper-elev px-3 py-2 text-sm dark:border-ink-muted dark:bg-ink-soft"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="company" className="text-sm font-medium">
            Company
          </label>
          <input
            id="company"
            name="company"
            required
            autoComplete="organization"
            className="mt-1 w-full rounded-md border border-paper-line bg-paper-elev px-3 py-2 text-sm dark:border-ink-muted dark:bg-ink-soft"
          />
        </div>
        <div>
          <label htmlFor="role" className="text-sm font-medium">
            Role
          </label>
          <input
            id="role"
            name="role"
            placeholder="CIO / CTO / Architect"
            className="mt-1 w-full rounded-md border border-paper-line bg-paper-elev px-3 py-2 text-sm dark:border-ink-muted dark:bg-ink-soft"
          />
        </div>
      </div>
      <div>
        <label htmlFor="message" className="text-sm font-medium">
          How can we help?
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          className="mt-1 w-full rounded-md border border-paper-line bg-paper-elev px-3 py-2 text-sm dark:border-ink-muted dark:bg-ink-soft"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-deep"
      >
        {submitLabel}
      </button>
      {status === 'sent' && (
        <p className="text-sm text-accent" role="status">
          Opening your email client to reach {SITE.demoEmail}…
        </p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-600" role="alert">
          Please email {SITE.demoEmail} directly.
        </p>
      )}
    </form>
  );
}
