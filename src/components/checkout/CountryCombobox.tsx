"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { COUNTRIES } from "@/lib/countries";
import { cn } from "@/lib/utils";

export function CountryCombobox({
  value,
  onChange,
  label = "Country",
}: {
  value: string;
  onChange: (nextValue: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedCountry = COUNTRIES.find((country) => country.code === value) ?? null;

  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return COUNTRIES;
    }

    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(normalizedQuery) ||
        country.code.toLowerCase().includes(normalizedQuery)
    );
  }, [query]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setQuery("");
        }}
        className="input-surface flex w-full items-center justify-between gap-3 bg-background text-left text-foreground dark:bg-slate-950"
      >
        <span className="truncate">{selectedCountry?.name || "Select a country"}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open ? (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_60px_-32px_rgba(15,23,42,0.4)] dark:bg-slate-950">
          <div className="border-b border-border px-3 py-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 dark:bg-slate-900">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search countries..."
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {filteredCountries.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                No country matches your search.
              </div>
            ) : (
              filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => {
                    onChange(country.code);
                    setQuery("");
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                    country.code === value
                      ? "bg-primary-blue/10 text-primary-blue"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <span className="truncate">{country.name}</span>
                  {country.code === value ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
