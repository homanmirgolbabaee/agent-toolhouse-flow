
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Code } from 'lucide-react';

interface NodeType {
  type: string;
  label: string;
  category: string;
  description: string;
  icon: React.ReactNode;
}

interface NodePanelProps {
  onDragStart: (event: React.DragEvent<HTMLDivElement>, nodeType: string) => void;
}

const NODE_TYPES: NodeType[] = [
  {
    type: 'toolhouseInput',
    label: 'Input',
    category: 'Input',
    description: 'Provide user input to the workflow',
    icon: <MessageSquare className="h-4 w-4" />
  },
  {
    type: 'outputNode',
    label: 'Output',
    category: 'Output',
    description: 'Display output of the workflow',
    icon: <Code className="h-4 w-4" />
  }
];

const NodePanel: React.FC<NodePanelProps> = ({ onDragStart }) => {
  return (
    <Card className="w-64 overflow-hidden">
      <CardHeader className="bg-muted py-3">
        <CardTitle className="text-sm">Components</CardTitle>
      </CardHeader>
      <CardContent className="p-3 grid gap-2">
        <p className="text-xs text-muted-foreground mb-2">
          Drag and drop components to build your workflow:
        </p>
        {NODE_TYPES.map((nodeType) => (
          <div
            key={nodeType.type}
            className="p-3 border rounded bg-background cursor-grab hover:bg-accent hover:text-accent-foreground transition-colors"
            draggable
            onDragStart={(event) => onDragStart(event, nodeType.type)}
          >
            <div className="font-medium text-sm flex items-center gap-2">
              {nodeType.icon}
              {nodeType.label}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{nodeType.description}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default NodePanel;
