import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { MessageSquare, Code, Sparkles, RefreshCw, CheckCircle, AlertCircle, X, Trash2, AlertTriangle } from 'lucide-react';
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

  return (
    <div 
      className={`
        relative rounded-xl border-2 bg-gradient-to-br ${style.gradient} 
        shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out
        min-w-[300px] max-w-[340px] backdrop-blur-sm
        ${selected ? 'ring-2 ring-blue-200 ring-opacity-60' : ''}
        ${isHovered ? 'transform scale-105' : 'transform scale-100'}
        ${data.isProcessing ? 'animate-pulse' : ''}
      `}
      style={{ borderColor: style.borderColor }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Delete Button - appears on hover or selection */}
      {(isHovered || selected) && (
        <div className="absolute -top-2 -right-2 z-10">
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                className="h-8 w-8 p-0 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
              >
                <X className="h-4 w-4" />
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
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`
            p-2.5 rounded-xl shadow-sm border transition-all duration-200
            ${isInputNode ? 'bg-blue-100 border-blue-200' : 
              isOutputNode ? 'bg-purple-100 border-purple-200' : 
              'bg-slate-100 border-slate-200'}
            ${isHovered ? 'shadow-md' : ''}
          `}>
            {isInputNode && <MessageSquare className="h-5 w-5 text-blue-600" />}
            {isOutputNode && <Code className="h-5 w-5 text-purple-600" />}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm text-slate-900">{data.label || 'Untitled'}</h3>
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
            <div className="bg-white/80 rounded-lg p-3 border border-slate-100 transition-all duration-200 hover:bg-white/90">
              <div className="text-xs font-medium text-slate-700 mb-1">Prompt</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {data.config?.prompt 
                  ? `"${truncateText(data.config.prompt, 80)}"` 
                  : "Configure your prompt..."}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/80 rounded-lg p-2.5 border border-slate-100 transition-all duration-200 hover:bg-white/90">
                <div className="text-xs font-medium text-slate-700 mb-1">Model</div>
                <div className="text-xs text-slate-600">{data.config?.model || 'gpt-4o-mini'}</div>
              </div>
              <div className="bg-white/80 rounded-lg p-2.5 border border-slate-100 transition-all duration-200 hover:bg-white/90">
                <div className="text-xs font-medium text-slate-700 mb-1">Status</div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    data.isProcessing ? 'bg-blue-400 animate-pulse' : 'bg-green-400'
                  }`}></div>
                  <span className="text-xs text-slate-600">
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
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 animate-pulse">
                <div className="flex items-center gap-3">
                  <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />
                  <div>
                    <div className="text-sm font-medium text-blue-700">Processing...</div>
                    <div className="text-xs text-blue-600">Running workflow</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            ) : data.output ? (
              <div className="bg-white/80 rounded-lg p-3 border border-slate-100 transition-all duration-200 hover:bg-white/90">
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
        <div className="absolute -top-2 -left-2">
          <div className="bg-white rounded-full p-1 shadow-sm border border-slate-200 animate-pulse">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"></div>
          </div>
        </div>
      )}
      
      {/* Selection indicator */}
      {selected && (
        <div className="absolute inset-0 rounded-xl border-2 border-blue-400 bg-blue-50/10 animate-pulse pointer-events-none"></div>
      )}
      
      {/* Handles */}
      {isInputNode ? (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="w-4 h-4 bg-blue-500 border-2 border-white shadow-sm transition-all duration-200 hover:w-5 hover:h-5"
        />
      ) : isOutputNode ? (
        <Handle 
          type="target" 
          position={Position.Top} 
          className="w-4 h-4 bg-purple-500 border-2 border-white shadow-sm transition-all duration-200 hover:w-5 hover:h-5"
        />
      ) : (
        <>
          <Handle 
            type="target" 
            position={Position.Top} 
            className="w-4 h-4 bg-slate-500 border-2 border-white shadow-sm transition-all duration-200 hover:w-5 hover:h-5"
          />
          <Handle 
            type="source" 
            position={Position.Bottom} 
            className="w-4 h-4 bg-slate-500 border-2 border-white shadow-sm transition-all duration-200 hover:w-5 hover:h-5"
          />
        </>
      )}
    </div>
  );
};

export default Node;