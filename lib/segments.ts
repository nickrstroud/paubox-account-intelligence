// Customer segments. Industry signals are tagged with the segments they affect,
// which is how one regulatory change fans out to every account in that segment.
export const SEGMENT_OPTIONS = [
  { value: "health_system", label: "Hospital & Health System" },
  { value: "physician_group", label: "Physician Group / Clinic" },
  { value: "dental", label: "Dental & Specialty Practice" },
  { value: "behavioral_health", label: "Behavioral Health" },
  { value: "digital_health", label: "Digital Health / Telehealth" },
  { value: "payer", label: "Payer / Health Plan" },
  { value: "pharmacy_lab", label: "Pharmacy, Lab & Diagnostics" },
  { value: "post_acute", label: "Senior Care / Home Health / Hospice" },
  { value: "business_associate", label: "Business Associate / Health IT Vendor" },
  { value: "other", label: "Other (Insurance, Education, etc.)" },
];

export function segmentLabel(value: string | undefined): string {
  return SEGMENT_OPTIONS.find((s) => s.value === value)?.label ?? "Unsegmented";
}

export const TIER_OPTIONS = [
  { value: "enterprise", label: "Enterprise", weight: 1.5 },
  { value: "mid_market", label: "Mid-Market", weight: 1.2 },
  { value: "smb", label: "SMB", weight: 1.0 },
];

export function tierLabel(value: string | undefined): string {
  return TIER_OPTIONS.find((t) => t.value === value)?.label ?? "—";
}

export function tierWeight(value: string | undefined): number {
  return TIER_OPTIONS.find((t) => t.value === value)?.weight ?? 1.0;
}
