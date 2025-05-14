import React from 'react';
import { ExternalLink } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  const parseMarkdown = (text: string): React.ReactNode[] => {
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
            <div key={index} className="my-4">
              <pre className="bg-slate-100 border rounded-lg p-4 overflow-x-auto">
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
          <h3 key={index} className="text-lg font-semibold text-slate-800 mb-3 mt-4 border-b border-slate-200 pb-1">
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
          <h2 key={index} className="text-xl font-semibold text-slate-800 mb-3 mt-5 border-b border-slate-200 pb-2">
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
          <h1 key={index} className="text-2xl font-bold text-slate-900 mb-4 mt-6 border-b-2 border-slate-300 pb-2">
            {line.replace(/^#\s*/, '')}
          </h1>
        );
        return;
      }

      // Handle numbered lists (including indented ones)
      if (line.match(/^\s*\d+\.\s/) || line.match(/^\s*[-*•]\s/)) {
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
          <p key={index} className="text-slate-700 mb-3 leading-relaxed">
            {formattedLine}
          </p>
        );
      } else if (!inList) {
        // Add some space for empty lines
        elements.push(<div key={index} className="h-3" />);
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
      <ListComponent key={key} className={`my-3 pl-6 space-y-2 ${isOrdered ? 'list-decimal' : 'list-disc'}`}>
        {items.map((item, i) => (
          <li key={i} className="text-slate-700 leading-relaxed pl-1">
            {formatInlineElements(item.replace(/^\s*[-*•]\s/, '').replace(/^\s*\d+\.\s/, ''))}
          </li>
        ))}
      </ListComponent>
    );
  };

  const formatInlineElements = (text: string): React.ReactNode => {
    // Split by markdown links first to handle them properly
    const parts = text.split(/(\[([^\]]+)\]\(([^)]+)\))/g);
    const elements: React.ReactNode[] = [];
    
    for (let i = 0; i < parts.length; i += 4) {
      const beforeLink = parts[i] || '';
      const fullMatch = parts[i + 1];
      const linkText = parts[i + 2];
      const linkUrl = parts[i + 3];
      
      // Process text before the link
      if (beforeLink) {
        elements.push(formatTextContent(beforeLink, `text-${i}`));
      }
      
      // Process the link
      if (fullMatch && linkText && linkUrl) {
        // Detect if it's a Twitter link for special styling
        const isTwitterLink = linkUrl.includes('twitter.com') || linkUrl.includes('x.com');
        
        elements.push(
          <a
            key={`link-${i}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`
              inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 
              hover:underline font-medium transition-colors
              ${isTwitterLink ? 'bg-blue-50 px-2 py-1 rounded-md' : ''}
            `}
          >
            {linkText}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }
    }
    
    return elements.length > 0 ? <>{elements}</> : formatTextContent(text, 'text-default');
  };

  const formatTextContent = (text: string, key: string): React.ReactNode => {
    // Handle inline code
    text = text.replace(/`([^`]+)`/g, '<code className="bg-slate-100 px-2 py-1 rounded text-sm font-mono text-slate-800">$1</code>');
    
    // Handle bold text
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong className="font-semibold text-slate-900">$1</strong>');
    
    // Handle italic text
    text = text.replace(/\*([^*]+)\*/g, '<em className="italic text-slate-700">$1</em>');
    
    // Handle emoji and special characters
    text = text.replace(/💯/g, '<span className="text-lg">💯</span>');
    
    // Convert back to JSX
    return <span key={key} dangerouslySetInnerHTML={{ __html: text }} />;
  };

  return (
    <div className={`prose prose-slate max-w-none ${className}`}>
      <div className="space-y-1">
        {parseMarkdown(content)}
      </div>
    </div>
  );
};

export default MarkdownRenderer;