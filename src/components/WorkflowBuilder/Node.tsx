
import React from 'react';
import { Handle, Position } from 'reactflow';
import { MessageSquare, Code } from 'lucide-react';

interface NodeData {
  label: string;
  type: string;
  config?: Record<string, any>;
  output?: any;
}

interface NodeProps {
  data: NodeData;
  selected: boolean;
}

const Node: React.FC<NodeProps> = ({ data, selected }) => {
  // Determine if this is an input or output node
  const isInputNode = data.type === 'toolhouseInput';
  const isOutputNode = data.type === 'outputNode';
  
  return (
    <div className={`p-3 rounded-md border ${selected ? 'border-primary' : 'border-border'} bg-card shadow-sm min-w-[220px]`}>
      <div className="font-medium text-sm mb-2 flex items-center gap-2">
        {isInputNode && <MessageSquare className="h-4 w-4" />}
        {isOutputNode && <Code className="h-4 w-4" />}
        {data.label}
      </div>
      
      {isInputNode && (
        <div className="text-xs text-muted-foreground mb-2">
          {data.config?.prompt ? `"${data.config.prompt.substring(0, 40)}${data.config.prompt.length > 40 ? '...' : ''}"` : "Configure prompt..."}
        </div>
      )}
      
      {isOutputNode && data.output && (
        <div className="text-xs bg-muted p-2 rounded max-h-[100px] overflow-y-auto">
          <pre className="whitespace-pre-wrap break-words">
            {typeof data.output === 'string' ? data.output.substring(0, 100) + (data.output.length > 100 ? '...' : '') : 'Output data available'}
          </pre>
        </div>
      )}
      
      <div className="text-xs text-muted-foreground">{data.type}</div>
      
      {/* Input nodes only have output handles */}
      {isInputNode ? (
        <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-primary" />
      ) : isOutputNode ? (
        /* Output nodes only have input handles */
        <Handle type="target" position={Position.Top} className="w-2 h-2 bg-primary" />
      ) : (
        /* Other nodes have both */
        <>
          <Handle type="target" position={Position.Top} className="w-2 h-2 bg-primary" />
          <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-primary" />
        </>
      )}
    </div>
  );
};

export default Node;
