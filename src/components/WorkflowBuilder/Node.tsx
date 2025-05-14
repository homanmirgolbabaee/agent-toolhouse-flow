import React from 'react';
import { Handle, Position } from 'reactflow';
import { MessageSquare, Code, Sparkles, RefreshCw, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface NodeData {
  label: string;
  type: string;
  config?: Record<string, any>;
  output?: any;
  isProcessing?: boolean;
  bundleId?: string;
}

interface NodeProps {
  data: NodeData;
  selected: boolean;
}

const Node: React.FC<NodeProps> = ({ data, selected }) => {
  const isInputNode = data.type === 'toolhouseInput';
  const isOutputNode = data.type === 'outputNode';
  
  const getNodeStyle = () => {
    if (isInputNode) {
      return {
        borderColor: selected ? '#3b82f6' : '#e2e8f0',
        backgroundColor: '#ffffff',
        gradient: 'from-blue-50 to-white'
      };
    } else if (isOutputNode) {
      return {
        borderColor: selected ? '#8b5cf6' : '#e2e8f0',
        backgroundColor: '#ffffff',
        gradient: 'from-purple-50 to-white'
      };
    }
    return {
      borderColor: selected ? '#3b82f6' : '#e2e8f0',
      backgroundColor: '#ffffff',
      gradient: 'from-white to-gray-50'
    };
  };

  const style = getNodeStyle();

  const getStatusIcon = () => {
    if (data.isProcessing) {
      return <RefreshCw className="h-3 w-3 text-blue-500 animate-spin" />;
    }
    if (isOutputNode && data.output) {
      return <CheckCircle className="h-3 w-3 text-green-500" />;
    }
    if (isOutputNode && !data.output) {
      return <AlertCircle className="h-3 w-3 text-amber-500" />;
    }
    return null;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div 
      className={`
        relative rounded-xl border-2 bg-gradient-to-br ${style.gradient} 
        shadow-sm hover:shadow-md transition-all duration-200
        min-w-[300px] max-w-[340px] backdrop-blur-sm
        ${selected ? 'ring-2 ring-blue-200' : ''}
      `}
      style={{ borderColor: style.borderColor }}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`
            p-2.5 rounded-xl shadow-sm border
            ${isInputNode ? 'bg-blue-100 border-blue-200' : 
              isOutputNode ? 'bg-purple-100 border-purple-200' : 
              'bg-slate-100 border-slate-200'}
          `}>
            {isInputNode && <MessageSquare className="h-5 w-5 text-blue-600" />}
            {isOutputNode && <Code className="h-5 w-5 text-purple-600" />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-slate-900">{data.label}</h3>
            <p className="text-xs text-slate-500 capitalize">
              {data.type.replace('toolhouse', '').replace('Node', '')}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {isInputNode && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        {isInputNode && (
          <div className="space-y-3">
            <div className="bg-white/80 rounded-lg p-3 border border-slate-100">
              <div className="text-xs font-medium text-slate-700 mb-1">Prompt</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {data.config?.prompt 
                  ? `"${truncateText(data.config.prompt, 80)}"` 
                  : "Configure your prompt..."}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/80 rounded-lg p-2.5 border border-slate-100">
                <div className="text-xs font-medium text-slate-700 mb-1">Model</div>
                <div className="text-xs text-slate-600">{data.config?.model || 'gpt-4o-mini'}</div>
              </div>
              <div className="bg-white/80 rounded-lg p-2.5 border border-slate-100">
                <div className="text-xs font-medium text-slate-700 mb-1">Status</div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span className="text-xs text-slate-600">Ready</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {isOutputNode && (
          <div className="space-y-3">
            {data.isProcessing ? (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                  <div>
                    <div className="text-sm font-medium text-blue-700">Processing...</div>
                    <div className="text-xs text-blue-600">Running workflow</div>
                  </div>
                </div>
              </div>
            ) : data.output ? (
              <div className="bg-white/80 rounded-lg p-3 border border-slate-100">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="text-xs font-medium text-slate-700">Output Ready</span>
                  <Badge variant="secondary" className="bg-green-50 text-green-700 text-xs ml-auto">
                    Complete
                  </Badge>
                </div>
                <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 max-h-[80px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-words text-slate-700 font-mono text-xs">
                    {typeof data.output === 'string' 
                      ? truncateText(data.output, 120)
                      : 'Output data ready for viewing'
                    }
                  </pre>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <div>
                    <div className="text-sm font-medium text-amber-700">Waiting for input</div>
                    <div className="text-xs text-amber-600">Connect and run workflow</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Bundle indicator */}
      {data.bundleId && (
        <div className="absolute -top-2 -right-2">
          <div className="bg-white rounded-full p-1 shadow-sm border border-slate-200">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
          </div>
        </div>
      )}
      
      {/* Handles */}
      {isInputNode ? (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="w-4 h-4 bg-blue-500 border-2 border-white shadow-sm"
        />
      ) : isOutputNode ? (
        <Handle 
          type="target" 
          position={Position.Top} 
          className="w-4 h-4 bg-purple-500 border-2 border-white shadow-sm"
        />
      ) : (
        <>
          <Handle 
            type="target" 
            position={Position.Top} 
            className="w-4 h-4 bg-slate-500 border-2 border-white shadow-sm"
          />
          <Handle 
            type="source" 
            position={Position.Bottom} 
            className="w-4 h-4 bg-slate-500 border-2 border-white shadow-sm"
          />
        </>
      )}
    </div>
  );
};

export default Node;