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
  Zap,
  Play,
  Settings,
  ChevronDown,
  ChevronRight,
  FileText
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
  const [isExpanded, setIsExpanded] = useState(true);
  
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
  const isYamlAgentNode = data.type === 'yamlAgentNode';
  
  const getNodeStyle = () => {
    if (isInputNode) {
      return {
        borderColor: selected ? '#4f46e5' : '#e2e8f0',
        backgroundColor: '#ffffff',
        gradient: 'from-indigo-50/80 via-white to-blue-50/50',
        accentColor: '#4f46e5'
      };
    } else if (isOutputNode) {
      return {
        borderColor: selected ? '#7c3aed' : '#e2e8f0',
        backgroundColor: '#ffffff',
        gradient: 'from-violet-50/80 via-white to-purple-50/50',
        accentColor: '#7c3aed'
      };
    } else if (isYamlAgentNode) {
      return {
        borderColor: selected ? '#10b981' : '#e2e8f0',
        backgroundColor: '#ffffff',
        gradient: 'from-emerald-50/80 via-white to-green-50/50',
        accentColor: '#10b981'
      };
    }
    return {
      borderColor: selected ? '#3b82f6' : '#e2e8f0',
      backgroundColor: '#ffffff',
      gradient: 'from-white to-gray-50/30',
      accentColor: '#3b82f6'
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
    if (isYamlAgentNode) {
      return <FileText className="h-5 w-5 text-emerald-600" />;
    }
    return <Zap className="h-5 w-5 text-slate-600" />;
  };

  const getStatusBadge = () => {
    if (data.isProcessing) {
      return (
        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Processing
        </Badge>
      );
    }
    if (isOutputNode && data.output) {
      return (
        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          Complete
        </Badge>
      );
    }
    if (isOutputNode && !data.output) {
      return (
        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Waiting
        </Badge>
      );
    }
    if (isYamlAgentNode && data.config?.agentConfig) {
      return (
        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
          <CheckCircle className="h-3 w-3 mr-1" />
          Configured
        </Badge>
      );
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
      boxShadow: '0 0 0 2px rgba(79, 70, 229, 0.2)',
      background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05), rgba(124, 58, 237, 0.05))',
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
        shadow-sm hover:shadow-lg transition-all duration-300 ease-in-out
        min-w-[320px] max-w-[360px] backdrop-blur-sm cursor-pointer
        ${isHovered ? 'transform scale-[1.005]' : ''}
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
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 border-2 border-white shadow-sm">
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 animate-pulse"></div>
          </div>
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

      {/* Header with modern n8n-style design */}
      <div className="relative">
        {/* Top accent bar */}
        <div 
          className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          style={{ backgroundColor: style.accentColor }}
        />
        
        <div className="p-5 pt-6">
          <div className="flex items-center gap-3">
            <div className={`
              p-3 rounded-xl shadow-sm border-2 transition-all duration-200
              ${isInputNode ? 'bg-indigo-50 border-indigo-100' : 
                isOutputNode ? 'bg-violet-50 border-violet-100' : 
                isYamlAgentNode ? 'bg-emerald-50 border-emerald-100' :
                'bg-slate-50 border-slate-100'}
              ${isHovered ? 'shadow-md transform scale-105' : ''}
            `}>
              {getNodeIcon()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">{data.label || 'Untitled'}</h3>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mt-1">
                {isYamlAgentNode ? 'YAML Agent' : data.type.replace('toolhouse', '').replace('Node', '')}
              </p>
            </div>
            
            {/* Expand/Collapse button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0 rounded-full hover:bg-slate-100"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-500" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {isInputNode && (
            <div className="space-y-3">
              <div className="bg-white/80 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Prompt</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {data.config?.prompt 
                    ? `"${truncateText(data.config.prompt, 100)}"` 
                    : "Configure your prompt..."}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/80 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Model</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300 font-mono">{data.config?.model || 'gpt-4o-mini'}</div>
                </div>
                <div className="bg-white/80 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Status</div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      data.isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-green-500'
                    }`}></div>
                    <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                      {data.isProcessing ? 'Processing' : 'Ready'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {isYamlAgentNode && (
            <div className="space-y-3">
              {data.config?.agentConfig ? (
                <>
                  <div className="bg-white/80 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Agent Info</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs font-medium text-slate-500">Title:</span>
                        <p className="text-sm text-slate-700 font-medium">{data.config.agentConfig.title}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-slate-500">Prompt:</span>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {truncateText(data.config.agentConfig.prompt, 120)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {Object.keys(data.config.variables || {}).length > 0 && (
                    <div className="bg-white/80 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Variables</span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(data.config.variables).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-xs">
                            <span className="text-slate-500 font-medium">{key}:</span>
                            <span className="text-slate-700 font-mono">
                              {truncateText(String(value), 30)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/80 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Model</div>
                      <div className="text-sm text-slate-600 dark:text-slate-300 font-mono">{data.config?.model || 'gpt-4o-mini'}</div>
                    </div>
                    <div className="bg-white/80 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Status</div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                          data.isProcessing ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'
                        }`}></div>
                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                          {data.isProcessing ? 'Processing' : 'Ready'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <div>
                      <div className="text-sm font-semibold text-orange-700 dark:text-orange-300">No Configuration</div>
                      <div className="text-xs text-orange-600 dark:text-orange-400">Upload a YAML file to configure this agent</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {isOutputNode && (
            <div className="space-y-3">
              {data.isProcessing ? (
                <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin" />
                    <div>
                      <div className="text-sm font-semibold text-blue-700 dark:text-blue-300">Processing...</div>
                      <div className="text-xs text-blue-600 dark:text-blue-400">Running workflow</div>
                    </div>
                  </div>
                </div>
              ) : data.output ? (
                <div className="bg-white/80 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Output Ready</span>
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs ml-auto">
                      Complete
                    </Badge>
                  </div>
                  <div className="text-xs bg-slate-50 dark:bg-slate-800 p-3 rounded border max-h-[90px] overflow-y-auto">
                    <pre className="whitespace-pre-wrap break-words text-slate-700 dark:text-slate-300 font-mono leading-relaxed">
                      {typeof data.output === 'string' 
                        ? truncateText(data.output, 150)
                        : 'Output data ready'
                      }
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-3 border border-orange-200 dark:border-orange-700">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <div>
                      <div className="text-sm font-semibold text-orange-700 dark:text-orange-300">Waiting for input</div>
                      <div className="text-xs text-orange-600 dark:text-orange-400">Connect and run workflow</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Enhanced handles */}
      {isInputNode || isYamlAgentNode ? (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="w-3 h-3 border-2 border-white dark:border-slate-800 shadow-lg rounded-full transition-all duration-200 hover:w-4 hover:h-4"
          style={{
            background: style.accentColor,
          }}
        />
      ) : isOutputNode ? (
        <Handle 
          type="target" 
          position={Position.Top} 
          className="w-3 h-3 border-2 border-white dark:border-slate-800 shadow-lg rounded-full transition-all duration-200 hover:w-4 hover:h-4"
          style={{
            background: style.accentColor,
          }}
        />
      ) : (
        <>
          <Handle 
            type="target" 
            position={Position.Top} 
            className="w-3 h-3 border-2 border-white dark:border-slate-800 shadow-lg rounded-full transition-all duration-200 hover:w-4 hover:h-4"
            style={{ background: style.accentColor }}
          />
          <Handle 
            type="source" 
            position={Position.Bottom} 
            className="w-3 h-3 border-2 border-white dark:border-slate-800 shadow-lg rounded-full transition-all duration-200 hover:w-4 hover:h-4"
            style={{ background: style.accentColor }}
          />
        </>
      )}
    </div>
  );
};

export default Node;