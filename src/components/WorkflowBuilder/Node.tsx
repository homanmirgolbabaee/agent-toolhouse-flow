import React from 'react';
import { Handle, Position } from 'reactflow';
import { MessageSquare, Code, Sparkles, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

interface NodeData {
  label: string;
  type: string;
  config?: Record<string, any>;
  output?: any;
  isProcessing?: boolean;
}

interface NodeProps {
  data: NodeData;
  selected: boolean;
}

const Node: React.FC<NodeProps> = ({ data, selected }) => {
  // Determine if this is an input or output node
  const isInputNode = data.type === 'toolhouseInput';
  const isOutputNode = data.type === 'outputNode';
  
  const getNodeStyle = () => {
    if (isInputNode) {
      return {
        borderColor: selected ? '#3b82f6' : '#e5e7eb',
        backgroundColor: '#f8fafc',
        gradient: 'from-blue-50 to-indigo-50'
      };
    } else if (isOutputNode) {
      return {
        borderColor: selected ? '#8b5cf6' : '#e5e7eb',
        backgroundColor: '#f8fafc',
        gradient: 'from-purple-50 to-pink-50'
      };
    }
    return {
      borderColor: selected ? '#3b82f6' : '#e5e7eb',
      backgroundColor: '#ffffff',
      gradient: 'from-white to-gray-50'
    };
  };

  const style = getNodeStyle();

  return (
    <div 
      className={`p-4 rounded-xl border-2 bg-gradient-to-br ${style.gradient} shadow-sm hover:shadow-md transition-all duration-200 min-w-[280px] max-w-[320px]`}
      style={{ borderColor: style.borderColor }}
    >
      {/* Node Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${isInputNode ? 'bg-blue-100' : isOutputNode ? 'bg-purple-100' : 'bg-gray-100'}`}>
          {isInputNode && <MessageSquare className={`h-4 w-4 ${isInputNode ? 'text-blue-600' : 'text-gray-600'}`} />}
          {isOutputNode && <Code className={`h-4 w-4 ${isOutputNode ? 'text-purple-600' : 'text-gray-600'}`} />}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-gray-900">{data.label}</h3>
          <p className="text-xs text-gray-500 capitalize">{data.type.replace('toolhouse', '').replace('Node', '')}</p>
        </div>
        {data.isProcessing && (
          <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
        )}
      </div>

      {/* Input Node Content */}
      {isInputNode && (
        <div className="space-y-3">
          <div className="bg-white/70 rounded-lg p-3 border">
            <div className="text-xs font-medium text-gray-700 mb-1">Prompt</div>
            <div className="text-xs text-gray-600 line-clamp-3">
              {data.config?.prompt ? `"${data.config.prompt}"` : "Configure prompt..."}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/70 rounded-lg px-2 py-1 border flex-1">
              <div className="text-xs font-medium text-gray-700">Model</div>
              <div className="text-xs text-gray-600">{data.config?.model || 'gpt-4o-mini'}</div>
            </div>
            <div className="flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-blue-500" />
              <span className="text-xs text-blue-600 font-medium">AI</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Output Node Content */}
      {isOutputNode && (
        <div className="space-y-3">
          {data.isProcessing ? (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                <span className="text-xs text-blue-700 font-medium">Processing workflow...</span>
              </div>
            </div>
          ) : data.output ? (
            <div className="bg-white/70 rounded-lg p-3 border">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div className="text-xs font-medium text-gray-700">Output</div>
              </div>
              <div className="text-xs bg-gray-50 p-2 rounded-lg max-h-[100px] overflow-y-auto">
                <pre className="whitespace-pre-wrap break-words text-gray-700">
                  {typeof data.output === 'string' 
                    ? data.output.substring(0, 150) + (data.output.length > 150 ? '...' : '') 
                    : 'Data ready for display'
                  }
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-500">Waiting for workflow execution...</span>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Handles */}
      {isInputNode ? (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="w-3 h-3 bg-blue-500 border-2 border-white shadow-md"
        />
      ) : isOutputNode ? (
        <Handle 
          type="target" 
          position={Position.Top} 
          className="w-3 h-3 bg-purple-500 border-2 border-white shadow-md"
        />
      ) : (
        <>
          <Handle 
            type="target" 
            position={Position.Top} 
            className="w-3 h-3 bg-gray-500 border-2 border-white shadow-md"
          />
          <Handle 
            type="source" 
            position={Position.Bottom} 
            className="w-3 h-3 bg-gray-500 border-2 border-white shadow-md"
          />
        </>
      )}
    </div>
  );
};

export default Node;