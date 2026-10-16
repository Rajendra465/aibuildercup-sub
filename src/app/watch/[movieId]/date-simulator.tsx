"use client";

import { ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";

interface DateSimulatorProps {
  date: string | null;
  seasonLabels: string[];
}

/** "Simulate date" picker: rewrites ?date= on the current URL, keeping other params (e.g. profile). */
export function DateSimulator({ date, seasonLabels }: DateSimulatorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const applyDate = (nextDate: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextDate) params.set("date", nextDate);
    else params.delete("date");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    applyDate(event.target.value || null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <label className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-slate-400">
        <CalendarDays className="size-3.5 text-[#F2A541]" />
        Simulate date
        <input
          type="date"
          value={date ?? ""}
          onChange={handleChange}
          className="bg-transparent text-slate-200 outline-none [color-scheme:dark]"
        />
      </label>
      {date && (
        <button type="button" onClick={() => applyDate(null)} className="text-slate-500 hover:text-slate-300">
          Reset to today
        </button>
      )}
      {seasonLabels.map((label) => (
        <span key={label} className="rounded-full border border-[#F2A541]/40 bg-[#F2A541]/10 px-2 py-0.5 text-[#F2A541]">
          {label}
        </span>
      ))}
    </div>
  );
}
