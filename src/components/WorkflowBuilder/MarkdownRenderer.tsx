import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  // Simple markdown parser for basic formatting
  const parseMarkdown = (text: string) => {
    // Split into lines for better processing
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent: string[] = [];
    let listItems: string[] = [];
    let inList = false;

    lines.forEach((line, index) => {
      // Handle code blocks
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // End of code block
          elements.push(
            <div key={index} className="my-3">
              <pre className="bg-slate-50 border rounded-lg p-3 overflow-x-auto">
                <code className="text-sm font-mono text-slate-800">
                  {codeContent.join('\n')}
                </code>
              </pre>
            </div>
          );
          codeContent = [];
          inCodeBlock = false;
        } else {
          // Start of code block
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      // Handle headers
      if (line.startsWith('###')) {
        if (inList) {
          elements.push(renderList(listItems, index));
          listItems = [];
          inList = false;
        }
        elements.push(
          <h3 key={index} className="text-base font-semibold text-slate-800 mb-2 mt-3">
            {line.replace(/^###\s*/, '')}
          </h3>
        );
        return;
      }

      if (line.startsWith('##')) {
        if (inList) {
          elements.push(renderList(listItems, index));
          listItems = [];
          inList = false;
        }
        elements.push(
          <h2 key={index} className="text-lg font-semibold text-slate-800 mb-2 mt-4">
            {line.replace(/^##\s*/, '')}
          </h2>
        );
        return;
      }

      if (line.startsWith('#')) {
        if (inList) {
          elements.push(renderList(listItems, index));
          listItems = [];
          inList = false;
        }
        elements.push(
          <h1 key={index} className="text-xl font-bold text-slate-900 mb-3 mt-4">
            {line.replace(/^#\s*/, '')}
          </h1>
        );
        return;
      }

      // Handle list items
      if (line.match(/^\s*[-*•]\s/) || line.match(/^\s*\d+\.\s/)) {
        inList = true;
        listItems.push(line);
        return;
      }

      // If we were in a list and hit a non-list line, render the list
      if (inList && line.trim() !== '') {
        elements.push(renderList(listItems, index));
        listItems = [];
        inList = false;
      }

      // Handle regular paragraphs
      if (line.trim() !== '') {
        const formattedLine = formatInlineElements(line);
        elements.push(
          <p key={index} className="text-sm text-slate-700 mb-2 leading-relaxed">
            {formattedLine}
          </p>
        );
      } else if (!inList) {
        // Add some space for empty lines
        elements.push(<div key={index} className="h-2" />);
      }
    });

    // Don't forget to render any remaining list
    if (inList) {
      elements.push(renderList(listItems, lines.length));
    }

    return elements;
  };

  const renderList = (items: string[], key: number) => {
    const isOrdered = items[0]?.match(/^\s*\d+\.\s/);
    const ListComponent = isOrdered ? 'ol' : 'ul';
    
    return (
      <ListComponent key={key} className={`my-2 pl-4 space-y-1 ${isOrdered ? 'list-decimal' : 'list-disc'}`}>
        {items.map((item, i) => (
          <li key={i} className="text-sm text-slate-700 leading-relaxed">
            {formatInlineElements(item.replace(/^\s*[-*•]\s/, '').replace(/^\s*\d+\.\s/, ''))}
          </li>
        ))}
      </ListComponent>
    );
  };

  const formatInlineElements = (text: string) => {
    // Handle inline code
    text = text.replace(/`([^`]+)`/g, '<code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono text-slate-800">$1</code>');
    
    // Handle bold text
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong className="font-semibold text-slate-900">$1</strong>');
    
    // Handle italic text
    text = text.replace(/\*([^*]+)\*/g, '<em className="italic">$1</em>');
    
    // Convert back to JSX
    return <span dangerouslySetInnerHTML={{ __html: text }} />;
  };

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {parseMarkdown(content)}
    </div>
  );
};

export default MarkdownRenderer;