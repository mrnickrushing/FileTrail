import type { Document } from '@/types/document';

export type AutopilotActionTone = 'danger' | 'warning' | 'success' | 'neutral';
export type AutopilotActionKind = 'due' | 'expiry' | 'review' | 'filing' | 'missing';

export type AutopilotAction = {
  id: string;
  kind: AutopilotActionKind;
  title: string;
  detail: string;
  tone: AutopilotActionTone;
  dueAt?: string;
  documentId?: string;
};

export type AutopilotSummary = {
  actions: AutopilotAction[];
  dueSoon: AutopilotAction[];
  expiringSoon: AutopilotAction[];
  needsReview: AutopilotAction[];
  needsFiling: AutopilotAction[];
  missingDocs: AutopilotAction[];
  people: Array<{ name: string; count: number }>;
};

const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

function daysUntil(date: string): number | null {
  const target = Date.parse(date);
  if (!Number.isFinite(target)) return null;
  return Math.ceil((target - Date.now()) / MILLIS_PER_DAY);
}

function formatDate(date: string): string {
  const parsed = Date.parse(date);
  if (!Number.isFinite(parsed)) return date;
  return new Date(parsed).toLocaleDateString();
}

function hasAutopilotContext(doc: Document): boolean {
  const facts = doc.facts;
  return Boolean(
    facts && (
      facts.personName?.trim()
      || facts.expirationDate
      || facts.dueDate
      || facts.issueDate
      || facts.issuer?.trim()
      || facts.policyNumber?.trim()
      || facts.accountNumber?.trim()
      || facts.memberNumber?.trim()
      || typeof facts.amountDue === 'number'
    )
  )
    || Boolean(doc.ocrText?.trim().length && doc.ocrText.trim().length > 40)
    || Boolean(doc.notes?.trim())
    || Boolean(doc.vendor?.trim())
    || Boolean(doc.sourceLabel?.trim())
    || Boolean(doc.emailSource?.subject?.trim() || doc.emailSource?.sender?.trim())
    || Boolean(doc.aiSource || doc.aiOrganizedAt);
}

export function buildAutopilotSummary(documents: Document[]): AutopilotSummary {
  const actions: AutopilotAction[] = [];
  const peopleMap = new Map<string, number>();

  for (const doc of documents) {
    const personName = doc.facts?.personName?.trim();
    if (personName) {
      peopleMap.set(personName, (peopleMap.get(personName) ?? 0) + 1);
    }

    const dueDate = doc.facts?.dueDate;
    const dueInDays = dueDate ? daysUntil(dueDate) : null;
    if (dueDate && dueInDays !== null && dueInDays <= 30) {
      actions.push({
        id: `due-${doc.id}`,
        kind: 'due',
        title: dueInDays < 0 ? `Past due: ${doc.title}` : `Due soon: ${doc.title}`,
        detail: dueInDays < 0 ? `Due date was ${formatDate(dueDate)}` : `Due ${formatDate(dueDate)}`,
        tone: dueInDays <= 7 ? 'danger' : 'warning',
        dueAt: dueDate,
        documentId: doc.id,
      });
    }

    const expirationDate = doc.facts?.expirationDate;
    const expiryInDays = expirationDate ? daysUntil(expirationDate) : null;
    if (expirationDate && expiryInDays !== null && expiryInDays <= 90) {
      actions.push({
        id: `expiry-${doc.id}`,
        kind: 'expiry',
        title: expiryInDays < 0 ? `Expired: ${doc.title}` : `Expiring soon: ${doc.title}`,
        detail: expiryInDays < 0 ? `Expired ${formatDate(expirationDate)}` : `Expires ${formatDate(expirationDate)}`,
        tone: expiryInDays <= 14 ? 'danger' : 'warning',
        dueAt: expirationDate,
        documentId: doc.id,
      });
    }

    if (!doc.folderId) {
      actions.push({
        id: `filing-${doc.id}`,
        kind: 'filing',
        title: !doc.folderId ? `Needs filing: ${doc.title}` : `Needs review: ${doc.title}`,
        detail: 'Move this into a folder or let Autopilot file it.',
        tone: 'neutral',
        documentId: doc.id,
      });
    } else if (!hasAutopilotContext(doc)) {
      actions.push({
        id: `review-${doc.id}`,
        kind: 'review',
        title: `Needs review: ${doc.title}`,
        detail: 'Add the expiry, due date, person name, or account number so Autopilot can track it.',
        tone: 'neutral',
        documentId: doc.id,
      });
    }
  }

  const categoriesPresent = new Set(documents.map((doc) => doc.category));
  const missingDocs: AutopilotAction[] = [];
  const recommended: Array<{ category: Document['category']; title: string; detail: string }> = [
    { category: 'id', title: 'Missing IDs', detail: 'Add licenses, passports, or birth certificates.' },
    { category: 'insurance', title: 'Missing insurance docs', detail: 'Add cards, policies, or EOBs.' },
    { category: 'medical', title: 'Missing medical records', detail: 'Add lab results, visits, or vaccine records.' },
    { category: 'bill', title: 'No active bills yet', detail: 'Forward utility or payment notices for reminders.' },
  ];
  for (const item of recommended) {
    if (!categoriesPresent.has(item.category)) {
      missingDocs.push({
        id: `missing-${item.category}`,
        kind: 'missing',
        title: item.title,
        detail: item.detail,
        tone: 'neutral',
      });
    }
  }

  actions.push(...missingDocs);
  actions.sort((a, b) => {
    const aTime = a.dueAt ? Date.parse(a.dueAt) : Number.MAX_SAFE_INTEGER;
    const bTime = b.dueAt ? Date.parse(b.dueAt) : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });

  return {
    actions,
    dueSoon: actions.filter((action) => action.kind === 'due'),
    expiringSoon: actions.filter((action) => action.kind === 'expiry'),
    needsReview: actions.filter((action) => action.kind === 'review'),
    needsFiling: actions.filter((action) => action.kind === 'filing'),
    missingDocs,
    people: Array.from(peopleMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
  };
}
