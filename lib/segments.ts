// Customer segments. Industry signals are tagged with the segments they affect,
// which is how one regulatory change fans out to every account in that segment.
export const SEGMENT_OPTIONS = [
  { value: "behavioral_health", label: "Behavioral Health", short: "Behavioral health" },
  { value: "health_system", label: "Hospitals & Health Systems", short: "Hospitals" },
  { value: "specialty_practice", label: "Specialty Practices", short: "Specialty practices" },
  { value: "healthtech", label: "HealthTech", short: "HealthTech" },
  { value: "telehealth", label: "Telehealth", short: "Telehealth" },
  { value: "pharmaceutical", label: "Pharmaceutical", short: "Pharma" },
  { value: "revenue_cycle", label: "Revenue Cycle", short: "Revenue cycle" },
  { value: "nonprofit", label: "Nonprofits", short: "Nonprofits" },
  { value: "education", label: "Education", short: "Education" },
];

export function segmentShortLabel(value: string): string {
  return SEGMENT_OPTIONS.find((s) => s.value === value)?.short ?? value;
}

export function segmentLabel(value: string | undefined): string {
  return SEGMENT_OPTIONS.find((s) => s.value === value)?.label ?? "Unsegmented";
}
