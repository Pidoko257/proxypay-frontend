import React, { useState, useEffect } from 'react';
import styles from './OnboardingWidget.module.css';

type Task = { id: string; label: string; completed: boolean };

export default function OnboardingWidget() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);
  const [accountAgeDays, setAccountAgeDays] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock API calls
    const fetchData = async () => {
      // Simulate API call for tasks
      setTasks([
        { id: '1', label: 'Complete KYC', completed: true },
        { id: '2', label: 'Generate API Key', completed: true },
        { id: '3', label: 'Configure Webhook', completed: false },
        { id: '4', label: 'Initiate Test Payment', completed: false },
        { id: '5', label: 'Invite Team Member', completed: false },
      ]);
      setAccountAgeDays(10); // Mock: 10 days old
      setLoading(false);
    };
    fetchData();

    // Load dismiss state
    const dismissed = localStorage.getItem('onboardingDismissed') === 'true';
    setIsDismissed(dismissed);
  }, []);

  const completedTasks = tasks.filter((t) => t.completed).length;
  const allTasksCompleted = completedTasks === tasks.length;
  const isVisible = accountAgeDays < 30 && !isDismissed && !allTasksCompleted;

  const handleDismiss = () => {
    localStorage.setItem('onboardingDismissed', 'true');
    setIsDismissed(true);
  };

  if (loading || !isVisible) return null;

  return (
    <div className={styles.widget}>
      <h3>Onboarding Checklist ({completedTasks}/{tasks.length})</h3>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className={task.completed ? styles.completed : ''}>
            <input type="checkbox" checked={task.completed} readOnly />
            {task.label}
          </li>
        ))}
      </ul>
      {completedTasks >= 3 && (
        <button onClick={handleDismiss}>Dismiss</button>
      )}
    </div>
  );
}
