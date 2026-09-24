"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface FilterContextValue {
  selectedScores: Set<number>;
  toggleScore: (score: number) => void;
  clearScores: () => void;
  period: string;
  setPeriod: (value: string) => void;
  updateType: string;
  setUpdateType: (value: string) => void;
  segment: string;
  setSegment: (value: string) => void;
}

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [selectedScores, setSelectedScores] = useState<Set<number>>(new Set());
  const [period, setPeriod] = useState("all");
  const [updateType, setUpdateType] = useState("all");
  const [segment, setSegment] = useState("all");

  const toggleScore = (score: number) => {
    setSelectedScores((prev) => {
      const next = new Set(prev);
      if (next.has(score)) next.delete(score);
      else next.add(score);
      return next;
    });
  };

  return (
    <FilterContext.Provider
      value={{
        selectedScores,
        toggleScore,
        clearScores: () => setSelectedScores(new Set()),
        period,
        setPeriod,
        updateType,
        setUpdateType,
        segment,
        setSegment,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilters must be used within a FilterProvider");
  return ctx;
}
