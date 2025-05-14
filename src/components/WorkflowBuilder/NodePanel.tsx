import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Code, Play, Plus, Group, Trash2, RefreshCw, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface NodeType {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface Bundle {
  id: string;
  name: string;
  nodeIds: string[];
  color: string;
  isRunning: boolean;
}

interface BundlesPanelProps {
  onDragStart: (event: React.DragEvent<HTMLDivElement>, nodeType: string) => void;
  bundles: Bundle[];
  onRunBundle: (bundleId: string) => void;
  onDeleteBundle: (bundleId: string) => void;
  selectedNodes: string[];
  onCreateBundle: () => void;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  onClearSelection: () => void;
}

const NODE_TYPES: NodeType[] = [
  {
    type: 'toolhouseInput',
    label: 'Input',
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'blue'
  },
  {
    type: 'outputNode',
    label: 'Output',
    icon: <Code className="h-4 w-4" />,
    color: 'purple'
  }
];

const BundlesPanel: React.FC<BundlesPanelProps> = ({
  onDragStart,
  bundles,
  onRunBundle,
  onDeleteBundle,
  selectedNodes,
  onCreateBundle,
  isSelectionMode,
  onToggleSelectionMode,
  onClearSelection
}) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' };
      case 'purple':
        return { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' };
      default:
        return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700' };
    }
  };

  const getBundleColorFromString = (colorString: string) => {
    const colorMap: {[key: string]: string} = {
      '#e3f2fd': 'Light Blue',
      '#f3e5f5': 'Light Purple', 
      '#e8f5e9': 'Light Green',
      '#fff3e0': 'Light Orange',
      '#fce4ec': 'Light Pink'
    };
    return colorMap[colorString] || 'Custom';
  };

  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-50 py-4 px-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900">Workflow</h2>
          </div>
          <Badge variant="secondary" className="text-xs">
            {bundles.length} bundles
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Bundle Creation Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Bundle Creation
          </h3>
          
          <div className="space-y-3">
            <Button
              onClick={onToggleSelectionMode}
              variant={isSelectionMode ? "default" : "outline"}
              className="w-full justify-start h-10"
            >
              <Group className="h-4 w-4 mr-2" />
              {isSelectionMode ? "Exit Selection Mode" : "Select Nodes for Bundle"}
            </Button>
            
            {isSelectionMode && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">
                    {selectedNodes.length} nodes selected
                  </span>
                  <div className="flex gap-2">
                    {selectedNodes.length > 0 && (
                      <Button
                        onClick={onCreateBundle}
                        size="sm"
                        className="h-7"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Create Bundle
                      </Button>
                    )}
                    <Button
                      onClick={onClearSelection}
                      size="sm"
                      variant="ghost"
                      className="h-7"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Active Bundles Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
              Active Bundles
            </h3>
            {bundles.length > 0 && (
              <Button
                onClick={() => bundles.forEach(bundle => onRunBundle(bundle.id))}
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                disabled={bundles.some(b => b.isRunning)}
              >
                <Play className="h-3 w-3 mr-1" />
                Run All
              </Button>
            )}
          </div>
          
          {bundles.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-6 text-center">
              <Group className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-1">No bundles created yet</p>
              <p className="text-xs text-slate-400">Select nodes and create your first bundle</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bundles.map((bundle) => (
                <div
                  key={bundle.id}
                  className="border border-slate-200 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow"
                  style={{ borderLeftColor: bundle.color, borderLeftWidth: '4px' }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-slate-900">{bundle.name}</h4>
                      {bundle.isRunning && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Running
                        </Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {bundle.nodeIds.length} nodes
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-1 mb-3">
                    <span className="text-xs text-slate-500">Color:</span>
                    <div
                      className="w-4 h-4 rounded border border-slate-200"
                      style={{ backgroundColor: bundle.color }}
                    />
                    <span className="text-xs text-slate-500">
                      {getBundleColorFromString(bundle.color)}
                    </span>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => onRunBundle(bundle.id)}
                      disabled={bundle.isRunning}
                      size="sm"
                      variant="outline"
                      className="flex-1 h-8 text-xs"
                    >
                      {bundle.isRunning ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3 mr-1" />
                          Run Bundle
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => onDeleteBundle(bundle.id)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Components Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
            Components
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
            {NODE_TYPES.map((nodeType) => {
              const colors = getColorClasses(nodeType.color);
              return (
                <div
                  key={nodeType.type}
                  className={`
                    p-3 rounded-lg border cursor-grab active:cursor-grabbing 
                    hover:shadow-sm transition-shadow ${colors.bg} ${colors.border}
                  `}
                  draggable
                  onDragStart={(event) => onDragStart(event, nodeType.type)}
                >
                  <div className="flex items-center gap-2">
                    <div className={colors.text}>
                      {nodeType.icon}
                    </div>
                    <span className={`text-sm font-medium ${colors.text}`}>
                      {nodeType.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <p className="text-xs text-slate-500 italic">
            Drag components to the canvas to add them
          </p>
        </div>
      </div>
    </div>
  );
};

export default BundlesPanel;