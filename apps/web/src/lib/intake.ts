const PREFIX = 'map.intake.';

export type IntakeAnswers = {
  focus: string;
  who: 'COUNSELOR' | 'MODERATOR' | 'EITHER';
  channel: 'CHAT' | 'VIDEO';
  danger: 'no' | 'yes';
  completedAt: string;
};

export function intakeKey(userId: string) {
  return `${PREFIX}${userId}`;
}

export function getIntake(userId: string): IntakeAnswers | null {
  try {
    const raw = localStorage.getItem(intakeKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as IntakeAnswers;
  } catch {
    return null;
  }
}

export function saveIntake(userId: string, answers: IntakeAnswers) {
  localStorage.setItem(intakeKey(userId), JSON.stringify(answers));
}

export function needsIntake(userId: string, role: string) {
  return role === 'CLIENT' && !getIntake(userId);
}
