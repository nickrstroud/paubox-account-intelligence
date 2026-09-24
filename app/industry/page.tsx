import { getCompanies, getIndustrySignals } from "@/lib/data";
import { withAffectedAccounts } from "@/lib/industry-view";
import IndustryFeed from "../IndustryFeed";

export default function IndustryPage() {
  const items = withAffectedAccounts(getIndustrySignals(), getCompanies());

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Industry signals</h1>
        <p className="text-sm text-slate-500">
          Breaches, OCR enforcement, HIPAA and state privacy rules, and CMS changes that rarely name a customer but
          give a reason to reach out to a whole segment. Sources: The HIPAA Journal, the Federal Register, and Google
          News topic searches, filtered and tagged by Claude.
        </p>
      </div>
      <IndustryFeed items={items} />
    </div>
  );
}
