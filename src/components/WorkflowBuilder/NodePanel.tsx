
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface NodeType {
  type: string;
  label: string;
  category: string;
  description: string;
}

interface NodePanelProps {
  onDragStart: (event: React.DragEvent<HTMLDivElement>, nodeType: string) => void;
}

const NODE_TYPES: NodeType[] = [
  {
    type: 'toolhouseInput',
    label: 'User Input',
    category: 'Input',
    description: 'Provide user input to the workflow'
  },
  {
    type: 'toolhouseTool',
    label: 'Toolhouse Tool',
    category: 'Tools',
    description: 'Execute a Toolhouse tool'
  },
  {
    type: 'llmNode',
    label: 'LLM',
    category: 'AI',
    description: 'Large Language Model processing'
  },
  {
    type: 'outputNode',
    label: 'Output',
    category: 'Output',
    description: 'Display output of the workflow'
  }
];

const NodePanel: React.FC<NodePanelProps> = ({ onDragStart }) => {
  return (
    <Card className="w-64 overflow-hidden">
      <CardHeader className="bg-muted py-3">
        <CardTitle className="text-sm">Components</CardTitle>
      </CardHeader>
      <CardContent className="p-3 grid gap-2">
        {NODE_TYPES.map((nodeType) => (
          <div
            key={nodeType.type}
            className="p-2 border rounded bg-background cursor-grab hover:bg-accent hover:text-accent-foreground transition-colors"
            draggable
            onDragStart={(event) => onDragStart(event, nodeType.type)}
          >
            <div className="font-medium text-xs">{nodeType.label}</div>
            <div className="text-xs text-muted-foreground">{nodeType.category}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default NodePanel;
