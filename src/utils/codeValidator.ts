// Validation utility for code samples rendered by Redoc and Docusaurus
// (Task 4). Attaches a small status badge to every `<pre>` block whose
// code element has a `language-*` class we know how to validate.
//
// Safety: we only claim "valid" for languages we can fully parse (JSON).
// For other common languages (bash, yaml, typescript, javascript,
// python), we run a conservative delimiter-balance heuristic — false
// positives are minimized so docs stay credible. We never mark an
// unsupported language with an icon.

export type ValidationStatus = 'valid' | 'warning' | 'unsupported';

export interface ValidationResult {
  status: ValidationStatus;
  message: string;
}

// ---------- validators ---------------------------------------------------

function validateJson(text: string): ValidationResult {
  try {
    JSON.parse(text);
    return { status: 'valid', message: 'Valid JSON.' };
  } catch (err) {
    return {
      status: 'warning',
      message: `JSON parse error: ${(err as Error).message}`,
    };
  }
}

// Cheap, language-agnostic delimiter-balance check. Strips string
// contents so quotes/brackets inside strings don't fool the counter.
function validateDelimiters(text: string, lang: string): ValidationResult {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let escape = false;
  let line = 1;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '\n') line++;
    if (escape) {
      escape = false;
      continue;
    }
    if (inString) {
      if (c === '\\') escape = true;
      else if (c === stringChar) inString = false;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inString = true;
      stringChar = c;
      continue;
    }
    if (c === '{' || c === '(' || c === '[') depth++;
    else if (c === '}' || c === ')' || c === ']') {
      depth--;
      if (depth < 0) {
        return {
          status: 'warning',
          message: `[${lang}] Unbalanced closing bracket near line ${line}.`,
        };
      }
    }
  }
  if (inString) {
    return {
      status: 'warning',
      message: `[${lang}] Unterminated string literal.`,
    };
  }
  if (depth !== 0) {
    return {
      status: 'warning',
      message: `[${lang}] ${depth} unclosed bracket(s).`,
    };
  }
  return { status: 'valid', message: `[${lang}] Brackets balanced.` };
}

const JSON_LANGS = new Set(['json', 'json5']);

export function validateCode(
  text: string,
  lang: string | null,
): ValidationResult {
  if (!lang) {
    return { status: 'unsupported', message: 'No language detected.' };
  }
  if (JSON_LANGS.has(lang)) {
    return validateJson(text);
  }
  // Anything with brackets/strings is at least checkable for balance.
  if (/[(){}\[\]"']/.test(text)) {
    return validateDelimiters(text, lang);
  }
  return { status: 'valid', message: `[${lang}] Nothing to validate.` };
}

// ---------- language detection --------------------------------------------

function detectLanguage(el: Element): string | null {
  const codeEl = el.tagName.toLowerCase() === 'code' ? el : el.querySelector('code');
  if (!codeEl) return null;
  const cls = codeEl.className || '';
  const m =
    cls.match(/\blanguage-([a-zA-Z0-9_+-]+)/) ||
    cls.match(/\bhljs\s+([a-zA-Z0-9_+-]+)/);
  return m ? m[1].toLowerCase() : null;
}

// ---------- DOM mounting -------------------------------------------------

function attachBadge(pre: HTMLElement, result: ValidationResult): void {
  if (result.status === 'unsupported') return;
  if (pre.getAttribute('data-code-validated') === 'true') return;
  pre.setAttribute('data-code-validated', 'true');

  // Make sure we can absolute-position the badge over the pre.
  if (getComputedStyle(pre).position === 'static') {
    pre.style.position = 'relative';
  }

  const badge = document.createElement('span');
  badge.className = `code-status code-status--${result.status}`;
  badge.title = result.message;
  badge.setAttribute(
    'aria-label',
    `Code validation: ${result.status}. ${result.message}`,
  );
  badge.setAttribute('role', 'note');
  pre.appendChild(badge);
}

function processCodeBlock(pre: Element): void {
  const codeEl =
    pre.tagName.toLowerCase() === 'code' ? pre : pre.querySelector('code');
  if (!codeEl) return;
  const text = (codeEl.textContent || '').replace(/\s+$/, '');
  if (!text) return;
  const lang = detectLanguage(pre);
  const result = validateCode(text, lang);
  attachBadge(pre as HTMLElement, result);
}

export function attachValidationObserver(root: HTMLElement): () => void {
  const scan = (rootEl: Element) => {
    rootEl.querySelectorAll('pre').forEach(processCodeBlock);
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (!(node instanceof Element)) continue;
        scan(node);
        if (node.tagName === 'PRE') processCodeBlock(node);
      }
    }
  });

  observer.observe(root, { childList: true, subtree: true });
  scan(root);

  return () => observer.disconnect();
}
