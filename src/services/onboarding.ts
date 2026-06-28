import { ONBOARDING_TASKS } from '../data/onboarding-tasks';

const STORAGE_PREFIX = 'proxypay_onboarding';

function getKey(name: string): string {
  return `${STORAGE_PREFIX}_${name}`;
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* localStorage full or unavailable */
  }
}

export interface OnboardingStatus {
  completedIds: string[];
  createdAt: number;
  dismissed: boolean;
}

export async function fetchOnboardingStatus(): Promise<OnboardingStatus> {
  const completedIds = loadJSON<string[]>(getKey('completed'), []);
  const createdAt = loadJSON<number>(getKey('created_at'), 0);
  const dismissed = loadJSON<boolean>(getKey('dismissed'), false);
  return { completedIds, createdAt, dismissed };
}

export async function completeTask(taskId: string): Promise<string[]> {
  const completed = loadJSON<string[]>(getKey('completed'), []);
  if (!ONBOARDING_TASKS.some((t) => t.id === taskId)) {
    throw new Error(`Unknown task: ${taskId}`);
  }
  if (!completed.includes(taskId)) {
    completed.push(taskId);
    saveJSON(getKey('completed'), completed);
  }
  return completed;
}

export async function dismissOnboarding(): Promise<void> {
  saveJSON(getKey('dismissed'), true);
}

export async function initAccount(): Promise<number> {
  const existing = loadJSON<number>(getKey('created_at'), 0);
  if (existing > 0) return existing;
  const now = Date.now();
  saveJSON(getKey('created_at'), now);
  return now;
}
