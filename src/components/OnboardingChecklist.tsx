import React, { useState, useEffect, useCallback } from 'react';
import {
  ONBOARDING_TASKS,
  type OnboardingTask,
} from '../data/onboarding-tasks';
import {
  fetchOnboardingStatus,
  completeTask,
  dismissOnboarding,
  initAccount,
} from '../services/onboarding';

const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;
const DISMISS_THRESHOLD = 3;

export default function OnboardingChecklist(): React.JSX.Element | null {
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [createdAt, setCreatedAt] = useState(0);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [status, created] = await Promise.all([
        fetchOnboardingStatus(),
        initAccount(),
      ]);
      if (cancelled) return;
      setCompletedIds(new Set(status.completedIds));
      setCreatedAt(created);
      setDismissed(status.dismissed);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleComplete = useCallback(async (taskId: string) => {
    setCompletedIds((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
    try {
      await completeTask(taskId);
    } catch {
      setCompletedIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  }, []);

  const handleDismiss = useCallback(async () => {
    setDismissed(true);
    await dismissOnboarding();
  }, []);

  if (loading) return null;

  const completedCount = completedIds.size;
  const totalCount = ONBOARDING_TASKS.length;
  const accountAge = Date.now() - createdAt;
  const isTooOld = accountAge > DAYS_30_MS;
  const allComplete = completedCount >= totalCount;
  const isDismissible = completedCount >= DISMISS_THRESHOLD && !allComplete;

  if (dismissed || allComplete || isTooOld) return null;

  const progressPct = Math.round((completedCount / totalCount) * 100);

  const tasks: (OnboardingTask & { completed: boolean })[] =
    ONBOARDING_TASKS.map((t) => ({ ...t, completed: completedIds.has(t.id) }));

  return (
    <div className="onboarding-checklist">
      <h3 className="onboarding-checklist-title">Getting Started</h3>
      <p className="onboarding-checklist-subtitle">
        Complete these steps to start using the ProxyPay API.
      </p>
      <div className="onboarding-checklist-progress">
        <div className="onboarding-checklist-progress-bar">
          <div
            className="onboarding-checklist-progress-fill"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <span className="onboarding-checklist-progress-text">
          {completedCount}/{totalCount}
        </span>
      </div>
      <ul className="onboarding-checklist-tasks">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={`onboarding-checklist-task${task.completed ? ' onboarding-checklist-task--completed' : ''}`}
          >
            <button
              className="onboarding-checklist-task-check"
              onClick={() => !task.completed && handleComplete(task.id)}
              aria-label={
                task.completed
                  ? `${task.label} (completed)`
                  : `Mark "${task.label}" as complete`
              }
            >
              {task.completed ? (
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <span className="onboarding-checklist-task-circle" />
              )}
            </button>
            <div className="onboarding-checklist-task-content">
              <span className="onboarding-checklist-task-label">
                {task.label}
              </span>
              <span className="onboarding-checklist-task-description">
                {task.description}
              </span>
            </div>
          </li>
        ))}
      </ul>
      {isDismissible && (
        <button className="onboarding-checklist-dismiss" onClick={handleDismiss}>
          Dismiss
        </button>
      )}
    </div>
  );
}
