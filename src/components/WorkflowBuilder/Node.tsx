
import React from 'react';
import { Handle, Position } from 'reactflow';

interface NodeData {
  label: string;
  type: string;
  config?: Record<string, any>;
}

interface NodeProps {
  data: NodeData;
  selected: boolean;
}

const Node: React.FC<NodeProps> = ({ data, selected }) => {
  return (
    <div className={`p-3 rounded-md border ${selected ? 'border-primary' : 'border-border'} bg-card shadow-sm min-w-[180px]`}>
      <div className="font-medium text-sm mb-2">{data.label}</div>
      <div className="text-xs text-muted-foreground">{data.type}</div>
      <Handle type="target" position={Position.Top} className="w-2 h-2 bg-primary" />
      <Handle type="source" position={Position.Bottom} className="w-2 h-2 bg-primary" />
    </div>
  );
};

export default Node;
