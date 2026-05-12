/// <reference types="vite-plus/client" />

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Calendar from '../../../src/components/calendar';
import '../../../src/App.css';

const createLocalDate = (year: number, month: number, day: number) =>
  new Date(year, month, day);

// eslint-disable-next-line react-refresh/only-export-components -- Playwright fixture entrypoint
function CalendarRegressionHarness() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    createLocalDate(2026, 0, 15)
  );
  const [hoverDate, setHoverDate] = useState<Date | null>(
    createLocalDate(2026, 0, 15)
  );
  const [bottomDate, setBottomDate] = useState<Date | null>(
    createLocalDate(2026, 0, 15)
  );
  const [inlineDate, setInlineDate] = useState<Date | null>(
    createLocalDate(2026, 0, 15)
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-8 px-4 py-12">
        <div>
          <h1 className="text-xl font-semibold">Calendar regression harness</h1>
          <p className="mt-1 text-sm text-slate-600">
            Browser-only fixture for permanent calendar regressions.
          </p>
        </div>

        <div className="space-y-2">
          <Calendar
            id="transaction-date"
            name="transaction_date"
            label="Tanggal transaksi"
            value={selectedDate}
            onChange={setSelectedDate}
            placeholder="Pilih tanggal transaksi"
            size="md"
          />
        </div>

        <div className="space-y-2">
          <label
            className="block text-sm font-semibold"
            htmlFor="hover-calendar-trigger"
          >
            Tanggal hover
          </label>
          <Calendar
            trigger="hover"
            value={hoverDate}
            onChange={setHoverDate}
            readOnly
          >
            <button
              id="hover-calendar-trigger"
              type="button"
              className="inline-flex h-10 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            >
              Tanggal hover
            </button>
          </Calendar>
        </div>

        <div data-testid="inline-calendar-stage" className="space-y-2">
          <h2 className="text-sm font-semibold">Tanggal inline</h2>
          <Calendar
            mode="inline"
            name="inline_date"
            value={inlineDate}
            onChange={setInlineDate}
            size="md"
          />
        </div>
      </section>

      <section
        data-testid="bottom-stage"
        className="flex min-h-screen items-end justify-center bg-white px-4 pb-3"
      >
        <div className="w-full max-w-sm space-y-2">
          <Calendar
            id="bottom-calendar"
            label="Tanggal dekat bawah"
            value={bottomDate}
            onChange={setBottomDate}
            placeholder="Pilih tanggal dekat bawah"
            size="md"
          />
        </div>
      </section>
    </main>
  );
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Calendar regression harness root element is missing');
}

createRoot(rootElement).render(<CalendarRegressionHarness />);
