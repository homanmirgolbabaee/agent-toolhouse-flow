import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { 
  MessageSquare, 
  Code, 
  Sparkles, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Trash2, 
  AlertTriangle,
  Bot,
  FileOutput,
  Zap
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface NodeData {
  label: string;
  type: string;
  config?: Record<string, any>;
  output?: any;
  isProcessing?: boolean;
  bundleId?: string;
  onDelete?: (nodeId: string) => void;
  isMultiSelected?: boolean;
  isSingleSelected?: boolean;
}

interface NodeProps {
  id: string;
  data?: NodeData; 
  selected?: boolean; 
}

const Node: React.FC<NodeProps> = ({ id, data, selected = false }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Safety check for data
  if (!data || !data.type) {
    console.error('Node component received invalid data:', { id, data });
    return (
      <div className="relative rounded-xl border-2 border-red-200 bg-red-50 shadow-sm min-w-[300px] max-w-[340px] p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 rounded-xl bg-red-100 border-red-200">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-red-900">Invalid Node</h3>
            <p className="text-xs text-red-500">Missing or invalid data</p>
          </div>
        </div>
        <div className="bg-red-100 rounded-lg p-3 border border-red-200">
          <p className="text-xs text-red-700">
            This node has invalid data. Please delete and recreate it.
          </p>
          <p className="text-xs text-red-600 font-mono mt-1">
            ID: {id || 'unknown'}
          </p>
        </div>
      </div>
    );
  }
  
  const isInputNode = data.type === 'toolhouseInput';
  const isOutputNode = data.type === 'outputNode';
  
  const getNodeStyle = () => {
    if (isInputNode) {
      return {
        borderColor: selected ? '#4f46e5' : '#e2e8f0',
        backgroundColor: '#ffffff',
        gradient: 'from-indigo-50/80 via-white to-blue-50/50'
      };
    } else if (isOutputNode) {
      return {
        borderColor: selected ? '#7c3aed' : '#e2e8f0',
        backgroundColor: '#ffffff',
        gradient: 'from-violet-50/80 via-white to-purple-50/50'
      };
    }
    return {
      borderColor: selected ? '#3b82f6' : '#e2e8f0',
      backgroundColor: '#ffffff',
      gradient: 'from-white to-gray-50/30'
    };
  };

  const style = getNodeStyle();

  const getNodeIcon = () => {
    if (isInputNode) {
      return <Bot className="h-5 w-5 text-indigo-600" />;
    }
    if (isOutputNode) {
      return <FileOutput className="h-5 w-5 text-violet-600" />;
    }
    return <Zap className="h-5 w-5 text-slate-600" />;
  };

  const getStatusIcon = () => {
    if (data.isProcessing) {
      return <RefreshCw className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
    }
    if (isOutputNode && data.output) {
      return <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />;
    }
    if (isOutputNode && !data.output) {
      return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
    }
    return null;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const handleDelete = () => {
    if (data.onDelete) {
      data.onDelete(id);
    }
    setIsDeleteDialogOpen(false);
  };

  // Get bundle styling
  const getBundleStyle = () => {
    if (!data.bundleId) return {};
    
    return {
      background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.08), rgba(124, 58, 237, 0.08))',
      border: '2px solid rgba(79, 70, 229, 0.2)',
    };
  };

  // Get selection styling
  const getSelectionStyle = () => {
    if (data.isMultiSelected) {
      return {
        boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.3), 0 0 25px rgba(79, 70, 229, 0.15)',
        transform: 'scale(1.02)',
      };
    }
    if (data.isSingleSelected || selected) {
      return {
        boxShadow: '0 0 0 2px rgba(79, 70, 229, 0.5), 0 0 30px rgba(79, 70, 229, 0.2)',
        transform: 'scale(1.02)',
      };
    }
    return {};
  };

  return (
    <div 
      className={`
        relative rounded-2xl border-2 bg-gradient-to-br ${style.gradient} 
        shadow-sm hover:shadow-md transition-all duration-300 ease-in-out
        min-w-[320px] max-w-[360px] backdrop-blur-sm cursor-pointer
        ${isHovered ? 'transform scale-[1.01]' : ''}
        ${data.isMultiSelected ? 'ring-2 ring-indigo-400 ring-opacity-40' : ''}
      `}
      style={{ 
        borderColor: style.borderColor,
        ...getBundleStyle(),
        ...getSelectionStyle(),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Bundle Indicator */}
      {data.bundleId && (
        <div className="absolute -top-2 -left-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 border-2 border-white shadow-sm animate-pulse"></div>
        </div>
      )}

      {/* Delete Button - appears on hover or selection */}
      {(isHovered || selected || data.isMultiSelected || data.isSingleSelected) && (
        <div className="absolute -top-2 -right-2 z-10">
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 w-8 p-0 rounded-full shadow-md hover:shadow-lg transition-all duration-200 hover:scale-110 bg-red-500 hover:bg-red-600"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Component</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this {data.label || 'component'}? This action cannot be undone and will remove all connected edges.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {/* Header */}
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={`
            p-3 rounded-xl shadow-sm border-2 transition-all duration-200
            ${isInputNode ? 'bg-indigo-50 border-indigo-100' : 
              isOutputNode ? 'bg-violet-50 border-violet-100' : 
              'bg-slate-50 border-slate-100'}
            ${isHovered ? 'shadow-md transform scale-105' : ''}
          `}>
            {getNodeIcon()}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base text-slate-900">{data.label || 'Untitled'}</h3>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
              {data.type.replace('toolhouse', '').replace('Node', '')}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            {isInputNode && (
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 text-xs border-indigo-200">
                <Sparkles className="h-3 w-3 mr-1" />
                AI
              </Badge>
            )}
            {data.bundleId && (
              <Badge variant="outline" className="text-xs bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 border-indigo-200">
                Bundle
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        {isInputNode && (
          <div className="space-y-3">
            <div className="bg-white/90 rounded-xl p-4 border border-slate-100 transition-all duration-200 hover:bg-white hover:shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-semibold text-slate-700">Prompt</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {data.config?.prompt 
                  ? `"${truncateText(data.config.prompt, 100)}"` 
                  : "Configure your prompt..."}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/90 rounded-xl p-3 border border-slate-100 transition-all duration-200 hover:bg-white">
                <div className="text-xs font-semibold text-slate-700 mb-2">Model</div>
                <div className="text-sm text-slate-600 font-mono">{data.config?.model || 'gpt-4o-mini'}</div>
              </div>
              <div className="bg-white/90 rounded-xl p-3 border border-slate-100 transition-all duration-200 hover:bg-white">
                <div className="text-xs font-semibold text-slate-700 mb-2">Status</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    data.isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'
                  }`}></div>
                  <span className="text-sm text-slate-600 font-medium">
                    {data.isProcessing ? 'Processing' : 'Ready'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {isOutputNode && (
          <div className="space-y-3">
            {data.isProcessing ? (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                  <div>
                    <div className="text-sm font-semibold text-blue-700">Processing...</div>
                    <div className="text-xs text-blue-600">Running workflow</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full animate-pulse w-full"></div>
                  </div>
                </div>
              </div>
            ) : data.output ? (
              <div className="bg-white/90 rounded-xl p-4 border border-slate-100 transition-all duration-200 hover:bg-white hover:shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm font-semibold text-slate-700">Output Ready</span>
                  <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs ml-auto border-emerald-200">
                    Complete
                  </Badge>
                </div>
                <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-100 max-h-[90px] overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-words text-slate-700 font-mono leading-relaxed">
                    {typeof data.output === 'string' 
                      ? truncateText(data.output, 150)
                      : 'Output data ready for viewing'
                    }
                  </pre>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  <div>
                    <div className="text-sm font-semibold text-amber-700">Waiting for input</div>
                    <div className="text-xs text-amber-600">Connect and run workflow</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Selection indicator */}
      {(data.isMultiSelected || data.isSingleSelected) && (
        <div className={`absolute inset-0 rounded-2xl pointer-events-none transition-all duration-300 ${
          data.isMultiSelected 
            ? 'border-2 border-indigo-400 bg-indigo-50/5' 
            : 'border-2 border-indigo-500 bg-indigo-50/10'
        }`}></div>
      )}
      
      {/* Handles */}
      {isInputNode ? (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="w-3 h-3 bg-indigo-500 border-2 border-white shadow-lg rounded-full transition-all duration-200 hover:w-4 hover:h-4 hover:shadow-xl"
          style={{
            boxShadow: '0 3px 10px rgba(79, 70, 229, 0.3)',
          }}
        />
      ) : isOutputNode ? (
        <Handle 
          type="target" 
          position={Position.Top} 
          className="w-3 h-3 bg-violet-500 border-2 border-white shadow-lg rounded-full transition-all duration-200 hover:w-4 hover:h-4 hover:shadow-xl"
          style={{
            boxShadow: '0 3px 10px rgba(124, 58, 237, 0.3)',
          }}
        />
      ) : (
        <>
          <Handle 
            type="target" 
            position={Position.Top} 
            className="w-3 h-3 bg-slate-500 border-2 border-white shadow-lg rounded-full transition-all duration-200 hover:w-4 hover:h-4 hover:shadow-xl"
          />
          <Handle 
            type="source" 
            position={Position.Bottom} 
            className="w-3 h-3 bg-slate-500 border-2 border-white shadow-lg rounded-full transition-all duration-200 hover:w-4 hover:h-4 hover:shadow-xl"
          />
        </>
      )}
    </div>
  );
};

export default Node;