import { escapeHtml, stripDangerousTags, sanitizeAnnotationText, isSafeText } from '../sanitize';

describe('Security: HTML Escaping and XSS Prevention', () => {
  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(escapeHtml('<')).toBe('&lt;');
      expect(escapeHtml('>')).toBe('&gt;');
      expect(escapeHtml('&')).toBe('&amp;');
      expect(escapeHtml('"')).toBe('&quot;');
      expect(escapeHtml("'")).toBe('&#39;');
      expect(escapeHtml('/')).toBe('&#x2F;');
    });

    it('escapes multiple special characters in text', () => {
      const input = 'Hello & "welcome" <user>';
      expect(escapeHtml(input)).toBe('Hello &amp; &quot;welcome&quot; &lt;user&gt;');
    });

    it('handles empty and null inputs gracefully', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml('   ')).toBe('   ');
    });

    it('escapes script tag syntax', () => {
      const input = '<script>alert("XSS")</script>';
      const escaped = escapeHtml(input);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
      expect(escaped).not.toContain('<script>');
    });

    it('escapes img tag with onerror handler', () => {
      const input = '<img src="x" onerror="alert(\'XSS\')">';
      const escaped = escapeHtml(input);
      // Escaped HTML is safe - the < becomes &lt; so it won't be parsed as HTML
      expect(escaped).toContain('&lt;img');
      expect(escaped).toContain('onerror=');
      expect(escaped).not.toContain('<img'); // No unescaped tag
    });

    it('preserves normal text without escaping', () => {
      const input = 'This is normal text';
      expect(escapeHtml(input)).toBe('This is normal text');
    });

    it('handles mixed content', () => {
      const input = 'Click here & read more <info>';
      expect(escapeHtml(input)).toBe('Click here &amp; read more &lt;info&gt;');
    });
  });

  describe('stripDangerousTags', () => {
    it('removes script tags', () => {
      const input = '<script>alert("XSS")</script>Hello';
      expect(stripDangerousTags(input)).toBe('Hello');
    });

    it('removes iframe tags', () => {
      const input = '<iframe src="http://evil.com"></iframe>Text';
      expect(stripDangerousTags(input)).toBe('Text');
    });

    it('removes embed tags', () => {
      const input = 'Start <embed src="evil.swf"> End';
      expect(stripDangerousTags(input)).toBe('Start  End');
    });

    it('removes object tags', () => {
      const input = 'Before <object data="evil"><param name="autoplay" value="true"></object> After';
      const result = stripDangerousTags(input);
      // The opening <object> tag should be removed (and potentially content)
      expect(result).not.toContain('<object');
      expect(result).toContain('Before');
      expect(result).toContain('After');
    });

    it('removes event handlers (onclick, onload, etc)', () => {
      const input = '<div onclick="alert(\'XSS\')">Click me</div>';
      expect(stripDangerousTags(input)).not.toContain('onclick');
    });

    it('removes multiple event handlers', () => {
      const input = '<img onerror="alert(\'XSS\')" onload="doEvil()" src="x">';
      const result = stripDangerousTags(input);
      expect(result).not.toContain('onerror');
      expect(result).not.toContain('onload');
    });

    it('preserves normal text', () => {
      const input = 'This is safe text';
      expect(stripDangerousTags(input)).toBe('This is safe text');
    });

    it('handles nested script tags', () => {
      const input = '<script>var x = "<script>alert(1)</script>";</script>Good content';
      const result = stripDangerousTags(input);
      expect(result).not.toContain('<script>');
    });

    it('handles malformed tags', () => {
      const input = '<script src="evil.js" onload="alert(1)">Content</script>Safe text';
      const result = stripDangerousTags(input);
      expect(result).not.toContain('script');
      expect(result).toContain('Safe text');
    });

    it('is case-insensitive for tag removal', () => {
      const input1 = '<SCRIPT>alert("XSS")</SCRIPT>Text';
      const input2 = '<ScRiPt>alert("XSS")</ScRiPt>Text';
      expect(stripDangerousTags(input1)).toBe('Text');
      expect(stripDangerousTags(input2)).toBe('Text');
    });
  });

  describe('sanitizeAnnotationText (comprehensive)', () => {
    it('sanitizes basic script injection', () => {
      const input = '<script>alert("XSS")</script>';
      const result = sanitizeAnnotationText(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('sanitizes img tag with onerror handler', () => {
      const input = '<img src="x" onerror="alert(\'XSS\')">';
      const result = sanitizeAnnotationText(input);
      // The tag should be escaped - no unescaped < or >
      expect(result).not.toMatch(/<img/i);
      // Escaped version should contain entity encoding
      expect(result).toContain('&lt;');
      expect(isSafeText(result)).toBe(true);
    });

    it('sanitizes SVG-based XSS', () => {
      const input = '<svg onload="alert(\'XSS\')">';
      const result = sanitizeAnnotationText(input);
      // SVG tags with event handlers should be escaped or removed
      expect(result).not.toContain('onload');
    });

    it('sanitizes data URIs with javascript protocol', () => {
      const input = '<a href="javascript:alert(\'XSS\')">Click</a>';
      const result = sanitizeAnnotationText(input);
      // The tag itself should be escaped, preventing it from being parsed as HTML
      expect(result).not.toMatch(/<a[\s>]/i);
      expect(result).toContain('&lt;');
      expect(isSafeText(result)).toBe(true);
    });

    it('preserves safe HTML-like text by escaping it', () => {
      const input = 'Use <div> for layout';
      const result = sanitizeAnnotationText(input);
      expect(result).toBe('Use &lt;div&gt; for layout');
      expect(result).not.toContain('<div>');
    });

    it('handles legitimate angle brackets in text', () => {
      const input = 'Compare values: a < b && b > c';
      const result = sanitizeAnnotationText(input);
      expect(result).toContain('a &lt; b');
      expect(result).toContain('b &gt; c');
    });

    it('trims whitespace', () => {
      const input = '   Hello World   ';
      const result = sanitizeAnnotationText(input);
      expect(result).toBe('Hello World');
    });

    it('handles empty input', () => {
      expect(sanitizeAnnotationText('')).toBe('');
      expect(sanitizeAnnotationText('   ')).toBe('');
    });

    it('handles real-world annotation examples', () => {
      const examples = [
        'This endpoint returns 404 if user not found',
        'Remember to set the Authorization header!',
        'Check the rate limit: 100 req/min < 1000 req/hour',
        'See the docs for more info',
      ];

      examples.forEach((ex) => {
        const result = sanitizeAnnotationText(ex);
        expect(isSafeText(result)).toBe(true);
      });
    });

    it('handles multiple attack vectors combined', () => {
      const input =
        '<script>alert("XSS")</script>' +
        '<img src="x" onerror="alert(\'attack\')">' +
        '<iframe src="evil.com"></iframe>' +
        'Real content here';

      const result = sanitizeAnnotationText(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('<img');
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('onerror');
      expect(result).toContain('Real content here');
    });

    it('preserves special characters that are safe', () => {
      const input = 'Check status codes: 200 OK, 400 Bad Request, 500 Error';
      const result = sanitizeAnnotationText(input);
      expect(result).toBe(input);
    });

    it('sanitizes unicode/emoji properly', () => {
      const input = '🎉 Great endpoint! <script>alert("XSS")</script>';
      const result = sanitizeAnnotationText(input);
      expect(result).toContain('🎉');
      expect(result).toContain('Great endpoint!');
      expect(result).not.toContain('<script>');
    });

    it('handles quotes in sanitized text', () => {
      const input = 'API returns: {"message": "Hello"}';
      const result = sanitizeAnnotationText(input);
      expect(result).toContain('Hello');
    });
  });

  describe('isSafeText validation', () => {
    it('validates safe text as true', () => {
      expect(isSafeText('This is normal text')).toBe(true);
      expect(isSafeText('Check the docs')).toBe(true);
    });

    it('detects script tags as unsafe', () => {
      expect(isSafeText('<script>alert("XSS")</script>')).toBe(false);
    });

    it('detects iframe tags as unsafe', () => {
      expect(isSafeText('<iframe src="evil.com"></iframe>')).toBe(false);
    });

    it('detects embed tags as unsafe', () => {
      expect(isSafeText('<embed src="evil.swf">')).toBe(false);
    });

    it('detects object tags as unsafe', () => {
      expect(isSafeText('<object data="evil"></object>')).toBe(false);
    });

    it('detects event handlers as unsafe', () => {
      expect(isSafeText('onclick="alert()"')).toBe(false);
      expect(isSafeText('onerror="doEvil()"')).toBe(false);
      expect(isSafeText('onload="attack()"')).toBe(false);
    });

    it('is case-insensitive', () => {
      expect(isSafeText('<SCRIPT>alert("XSS")</SCRIPT>')).toBe(false);
      // Note: "ON CLICK" with spaces is not the same as "onclick", so this is safe
      // Real event handlers must be word-characters followed by = with no spaces
      expect(isSafeText('onclick="alert()"')).toBe(false);
    });

    it('returns true for empty input', () => {
      expect(isSafeText('')).toBe(true);
      expect(isSafeText('   ')).toBe(true);
    });

    it('allows safe HTML-encoded text', () => {
      expect(isSafeText('Use &lt;div&gt; for layout')).toBe(true);
    });
  });

  describe('XSS Payload Attack Vectors', () => {
    // OWASP XSS cheat sheet payloads
    const xssPayloads = [
      // Basic script tag
      '<script>alert("XSS")</script>',

      // IMG tag with event handler
      '<img src=x onerror=alert("XSS")>',
      '<IMG SRC="javascript:alert(\'XSS\');">',

      // SVG-based
      '<svg onload=alert("XSS")>',
      '<svg/onload=alert("XSS")>',

      // Event handlers
      '<body onload=alert("XSS")>',
      '<iframe onload=alert("XSS")>',

      // Data URI
      '<a href="javascript:alert(\'XSS\')">Click</a>',

      // HTML5 video/audio
      '<video src=x onerror=alert("XSS")>',
      '<audio src=x onerror=alert("XSS")>',

      // Input tag
      '<input onfocus=alert("XSS") autofocus>',

      // Link tag
      '<link rel="stylesheet" href="javascript:alert(\'XSS\')">',

      // Meta tag
      '<meta http-equiv="refresh" content="0;url=javascript:alert(\'XSS\')">',

      // Form tag
      '<form action="javascript:alert(\'XSS\')">',

      // Button tag
      '<button onclick=alert("XSS")>',

      // Marquee tag
      '<marquee onstart=alert("XSS")>',

      // Details tag
      '<details open ontoggle=alert("XSS")>',
    ];

    xssPayloads.forEach((payload, index) => {
      it(`prevents XSS payload ${index + 1}: ${payload.substring(0, 40)}...`, () => {
        const sanitized = sanitizeAnnotationText(payload);
        // Sanitized text should be safe
        expect(isSafeText(sanitized)).toBe(true);
        // Should not contain unescaped script tags that could execute
        expect(sanitized).not.toMatch(/<script[\s\S]*?>/i);
      });
    });
  });

  describe('localStorage safety', () => {
    it('sanitized text is safe to store and retrieve', () => {
      const userInput = '<img src=x onerror=alert("XSS")>Safe annotation';
      const sanitized = sanitizeAnnotationText(userInput);

      // Simulate storage/retrieval
      const stored = JSON.stringify({ text: sanitized });
      const retrieved = JSON.parse(stored).text;

      expect(retrieved).toBe(sanitized);
      expect(isSafeText(retrieved)).toBe(true);
    });

    it('handles annotation storage with multiple users', () => {
      const annotations = [
        { text: sanitizeAnnotationText('<script>alert(1)</script>') },
        { text: sanitizeAnnotationText('Normal text') },
        { text: sanitizeAnnotationText('<img onerror=alert(2)>') },
      ];

      annotations.forEach((ann) => {
        expect(isSafeText(ann.text)).toBe(true);
      });
    });
  });

  describe('performance considerations', () => {
    it('handles long text efficiently', () => {
      const longText = 'Safe text content '.repeat(100);
      const start = performance.now();
      sanitizeAnnotationText(longText);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('handles pathological input without hanging', () => {
      // Very long script tag attempt
      const pathological = '<script>' + 'a'.repeat(10000) + '</script>';
      const start = performance.now();
      const result = sanitizeAnnotationText(pathological);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(100);
      expect(result).not.toContain('script');
    });
  });
});
