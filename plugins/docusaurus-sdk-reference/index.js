const path = require('path');
const fs = require('fs');

module.exports = function sdkReferencePlugin(context, options) {
  const {
    sdkSourceDir = '../proxypay-sdk/src',
    outputDir = 'sdk-reference',
  } = options;

  return {
    name: 'docusaurus-sdk-reference',

    async loadContent() {
      const sourcePath = path.resolve(context.siteDir, sdkSourceDir);
      if (!fs.existsSync(sourcePath)) {
        console.warn(
          `[sdk-reference] SDK source directory not found at "${sourcePath}". ` +
          'Set sdkSourceDir in plugin options to the correct path. Skipping doc generation.'
        );
        return [];
      }

      let typedoc;
      try {
        typedoc = require('typedoc');
      } catch {
        console.warn(
          '[sdk-reference] typedoc is not installed. Run: npm install --save-dev typedoc'
        );
        return [];
      }

      const app = await typedoc.Application.bootstrap({
        entryPoints: [sourcePath],
        tsconfig: path.resolve(context.siteDir, '../proxypay-sdk/tsconfig.json'),
      });

      const project = await app.convert();
      if (!project) {
        console.error('[sdk-reference] TypeDoc failed to convert the project.');
        return [];
      }

      const reflections = [];
      const walk = (parent) => {
        parent.children?.forEach((child) => {
          if (child.kind === typedoc.ReflectionKind.Class || child.kind === typedoc.ReflectionKind.Function) {
            reflections.push(child);
          }
          walk(child);
        });
      };
      walk(project);

      return reflections;
    },

    async contentLoaded({ content, actions }) {
      if (!content || content.length === 0) return;
      const { addRoute, setGlobalData } = actions;

      const docsDir = path.join(context.siteDir, 'docs', outputDir);
      fs.mkdirSync(docsDir, { recursive: true });

      const sidebarItems = [];

      for (const ref of content) {
        const mdxContent = generateMdx(ref);
        const slug = ref.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const filePath = path.join(docsDir, `${slug}.mdx`);
        fs.writeFileSync(filePath, mdxContent, 'utf-8');
        sidebarItems.push({ type: 'doc', id: `${outputDir}/${slug}`, label: ref.name });
      }

      const sidebarPath = path.join(docsDir, '_sidebar_.json');
      fs.writeFileSync(sidebarPath, JSON.stringify(sidebarItems, null, 2), 'utf-8');

      setGlobalData({ sdkReferenceItems: sidebarItems });

      for (const ref of content) {
        const slug = ref.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        addRoute({
          path: `/${outputDir}/${slug}`,
          component: '@theme/MDXPage',
          modules: { content: path.join('@site/docs', outputDir, `${slug}.mdx`) },
          exact: true,
        });
      }
    },
  };
};

function generateMdx(reflection) {
  const lines = [
    '---',
    `title: ${reflection.name}`,
    `description: ${reflection.comment?.summaryText || `${reflection.name} API reference`}`,
    '---',
    '',
    `# ${reflection.name}`,
    '',
  ];

  if (reflection.comment?.summaryText) {
    lines.push(reflection.comment.summaryText, '');
  }

  if (reflection.signatures) {
    for (const sig of reflection.signatures) {
      const params = (sig.parameters || []).map((p) => {
        const pType = p.type ? p.type.toString() : 'unknown';
        return `- \`${p.name}\` (\`${pType}\`)${p.comment?.summaryText ? ` — ${p.comment.summaryText}` : ''}`;
      });

      const returnType = sig.type ? sig.type.toString() : 'void';

      lines.push('## Method Signature', '', '```typescript');
      lines.push(`${reflection.name}(${(sig.parameters || []).map((p) => `${p.name}: ${p.type ? p.type.toString() : 'unknown'}`).join(', ')}): ${returnType}`);
      lines.push('```', '');
      if (params.length) {
        lines.push('### Parameters', '', ...params, '');
      }
      lines.push(`**Returns:** \`${returnType}\``, '');
    }
  }

  const exampleTag = reflection.comment?.blockTags?.find((t) => t.tag === '@example');
  if (exampleTag) {
    lines.push('## Example', '', '```typescript', exampleTag.content?.map((c) => c.text).join('\n') || '', '```', '');
  }

  return lines.join('\n');
}
