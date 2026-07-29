/**
 * Returns true when the event target is an editable field where shortcut keys
 * should not be intercepted (inputs, textareas, selects, contenteditable).
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }

  return target.isContentEditable;
}
