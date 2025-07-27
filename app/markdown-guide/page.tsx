import { generateNextMetadata, generateStructuredData } from '../seo-metadata';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import 'highlight.js/styles/github-dark.css';
import Link from 'next/link';
import { ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const MarkdownGuide = () => {
  const markdownSections = [
    {
      title: "Headings",
      syntax: `# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6`,
      description: "Create hierarchical headings using 1-6 hash symbols."
    },
    {
      title: "Text Formatting",
      syntax: `**Bold text**
*Italic text*
***Bold and italic***
~~Strikethrough text~~
\`Inline code\`
Regular text with formatting.`,
      description: "Style your text with bold, italic, strikethrough, and inline code formatting."
    },
    {
      title: "Lists",
      syntax: `**Unordered Lists:**
- First item
- Second item
  - Nested item
  - Another nested item
- Third item

**Ordered Lists:**
1. First item
2. Second item
   1. Nested numbered item
   2. Another nested item
3. Third item`,
      description: "Create bulleted or numbered lists with support for nesting."
    },
    {
      title: "Task Lists",
      syntax: `- [x] Completed task
- [x] Another completed item
- [ ] Incomplete task
- [ ] Another incomplete task
  - [x] Nested completed task
  - [ ] Nested incomplete task`,
      description: "Interactive checkboxes for to-do lists and project tracking."
    },
    {
      title: "Links and Images",
      syntax: `**Links:**
[Link text](https://example.com)
[Link with title](https://example.com "This is a title")
<https://auto-link.com>

**Images:**
![Alt text](https://via.placeholder.com/300x150/4F46E5/FFFFFF?text=Sample+Image)
![Image with title](https://via.placeholder.com/200x100/059669/FFFFFF?text=Smaller "Image title")`,
      description: "Add clickable links and embed images with alt text and titles."
    },
    {
      title: "Code Blocks",
      syntax: `**Inline Code:**
Use \`console.log()\` for debugging.

**JavaScript:**
\`\`\`javascript
function greetUser(name) {
  console.log(\`Hello, \${name}!\`);
  return \`Welcome, \${name}\`;
}

greetUser("World");
\`\`\`

**Python:**
\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
\`\`\`

**SQL:**
\`\`\`sql
SELECT users.name, COUNT(orders.id) as order_count
FROM users
LEFT JOIN orders ON users.id = orders.user_id
WHERE users.created_at > '2024-01-01'
GROUP BY users.id
ORDER BY order_count DESC;
\`\`\`

**JSON:**
\`\`\`json
{
  "name": "Dashboard Config",
  "version": "1.0.0",
  "features": [
    "charts",
    "textboxes", 
    "markdown"
  ],
  "settings": {
    "theme": "dark",
    "autoSave": true
  }
}
\`\`\``,
      description: "Syntax-highlighted code blocks for various programming languages."
    },
    {
      title: "Tables",
      syntax: `| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| Charts | ✅ Complete | High | Drag & drop support |
| Textboxes | ✅ Complete | High | Markdown support |
| Export | 🚧 In Progress | Medium | PDF and PNG |
| Sharing | ⏳ Planned | Low | Public dashboards |

**Alignment:**
| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Text | Text | Text |
| More | Content | Here |`,
      description: "Create structured data tables with optional column alignment."
    },
    {
      title: "Blockquotes",
      syntax: `> This is a simple blockquote.

> **Multi-line blockquote:**
> 
> This blockquote spans multiple lines and can contain
> other formatting like **bold text** and *italics*.
> 
> > Nested blockquotes are also supported
> > for additional emphasis.

> 💡 **Tip:** Use blockquotes for important notes,
> quotes, or highlighting key information.`,
      description: "Highlight important information or add quotations."
    },
    {
      title: "Horizontal Rules",
      syntax: `Content above the rule.

---

Content below the rule.

***

Another section separator.`,
      description: "Create visual separators between content sections."
    },
    {
      title: "HTML Support",
      syntax: `**Collapsible Sections:**
<details>
<summary>Click to expand</summary>

This content is hidden by default and can contain:
- Regular markdown
- **Formatted text**
- \`Code snippets\`

</details>

**Highlighted Text:**
<mark>This text is highlighted</mark> for emphasis.

**Subscript and Superscript:**
H<sub>2</sub>O (water)
E = mc<sup>2</sup> (Einstein's formula)

**Keyboard Keys:**
Press <kbd>Ctrl</kbd> + <kbd>C</kbd> to copy.`,
      description: "Use HTML tags for advanced formatting not available in standard markdown."
    },
    {
      title: "Advanced Formatting",
      syntax: `**Escape Characters:**
Use backslash to escape special characters: \\* \\_ \\# \\[

**Line Breaks:**
This line ends with two spaces  
So this starts on a new line.

Hard line break:

This has a blank line above it.

**Combining Features:**
### 📊 Dashboard Analytics

| Metric | Value | Trend |
|--------|-------|-------|
| Users | 1,234 | ↗️ +12% |
| Revenue | $45,678 | ↗️ +8% |

\`\`\`javascript
// Track user engagement
analytics.track('dashboard_view', {
  timestamp: new Date(),
  user_id: getCurrentUser().id
});
\`\`\`

> 💡 **Pro Tip:** Combine tables, code blocks, and formatting
> for comprehensive documentation.`,
      description: "Advanced techniques for escaping characters and combining features."
    }
  ];

  const renderMarkdownSection = (syntax: string) => (
    <div className="prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={{
          table: ({children, ...props}) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-gray-700" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({children, ...props}) => (
            <th className="border border-gray-700 px-3 py-2 bg-gray-800 text-gray-200 font-semibold" {...props}>
              {children}
            </th>
          ),
          td: ({children, ...props}) => (
            <td className="border border-gray-700 px-3 py-2 text-gray-300" {...props}>
              {children}
            </td>
          ),
          li: ({children, className, ...props}) => {
            if (className?.includes('task-list-item')) {
              return (
                <li className="list-none flex items-start gap-2" {...props}>
                  {children}
                </li>
              );
            }
            return <li {...props}>{children}</li>;
          },
          input: ({type, ...props}) => {
            if (type === 'checkbox') {
              return <input type="checkbox" className="mt-1 accent-blue-500" {...props} />;
            }
            return <input type={type} {...props} />;
          }
        }}
      >
        {syntax}
      </ReactMarkdown>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-900 bg-black/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link 
                href="/dashboards"
                className="flex items-center space-x-2 text-gray-400 hover:text-gray-200 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Dashboards</span>
              </Link>
              <div className="w-px h-6 bg-gray-700"></div>
              <div className="flex items-center space-x-3">
                <DocumentTextIcon className="w-6 h-6 text-blue-500" />
                <h1 className="text-xl font-semibold text-gray-200">Markdown Guide</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Introduction */}
        <div className="mb-12">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-blue-400 mb-3">
              📚 Complete Markdown Reference
            </h2>
            <p className="text-gray-300 leading-relaxed">
              This guide covers all markdown features supported in dashboard textboxes. 
              Each section includes syntax examples and live previews showing how your 
              markdown will appear when rendered.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-12">
          {markdownSections.map((section, index) => (
            <section key={index} className="border border-gray-800 rounded-xl overflow-hidden">
              {/* Section Header */}
              <div className="bg-gray-900/50 px-6 py-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold text-gray-200 mb-2">
                  {section.title}
                </h3>
                <p className="text-gray-400 text-sm">
                  {section.description}
                </p>
              </div>

              {/* Content Grid */}
              <div className="grid lg:grid-cols-2 gap-0">
                {/* Syntax Column */}
                <div className="border-r border-gray-800">
                  <div className="bg-gray-900/30 px-4 py-2 border-b border-gray-800">
                    <h4 className="text-sm font-medium text-gray-300">Markdown Syntax</h4>
                  </div>
                  <div className="p-4">
                    <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto text-sm">
                      <code className="text-gray-300 whitespace-pre">
                        {section.syntax}
                      </code>
                    </pre>
                  </div>
                </div>

                {/* Preview Column */}
                <div>
                  <div className="bg-gray-900/30 px-4 py-2 border-b border-gray-800">
                    <h4 className="text-sm font-medium text-gray-300">Live Preview</h4>
                  </div>
                  <div className="p-4 bg-black/20">
                    {renderMarkdownSection(section.syntax)}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <div className="bg-gray-900/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-3">
              🚀 Ready to Create?
            </h3>
            <p className="text-gray-400 mb-4">
              Now that you know all the markdown features, head back to your dashboards 
              and create rich, formatted textboxes using these techniques.
            </p>
            <div className="flex space-x-4">
              <Link 
                href="/dashboards"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Back to Dashboards
              </Link>
              <Link 
                href="/explorer"
                className="inline-flex items-center px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Go to Explorer
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// SEO Structured Data
const structuredData = generateStructuredData('/markdown-guide');

export default MarkdownGuide; 

export const metadata = generateNextMetadata('/markdown-guide');