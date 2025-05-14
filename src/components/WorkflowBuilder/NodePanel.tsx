import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageSquare, 
  Code, 
  Play, 
  Plus, 
  Group, 
  Trash2, 
  RefreshCw, 
  Layers, 
  Edit2, 
  Check, 
  X,
  Bot,
  FileOutput,
  Sparkles,
  Palette,
  ChevronDown,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

interface NodeType {
  type: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
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
  onRenameBundle: (bundleId: string, newName: string) => void;
  selectedNodes: string[];
  onCreateBundle: (selectedColor?: { name: string; color: string; light: string }) => void;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  onClearSelection: () => void;
  colorPalette?: { name: string; color: string; light: string }[];
  onChangeBundleColor?: (bundleId: string, newColor: { name: string; color: string; light: string }) => void;
}

// Default color palette if none provided
const DEFAULT_COLOR_PALETTE = [
  { name: 'Blue', color: '#3B82F6', light: '#DBEAFE' },
  { name: 'Purple', color: '#8B5CF6', light: '#EDE9FE' },
  { name: 'Green', color: '#10B981', light: '#D1FAE5' },
  { name: 'Red', color: '#EF4444', light: '#FEE2E2' },
  { name: 'Orange', color: '#F59E0B', light: '#FEF3C7' },
  { name: 'Pink', color: '#EC4899', light: '#FCE7F3' },
  { name: 'Indigo', color: '#6366F1', light: '#E0E7FF' },
  { name: 'Yellow', color: '#EAB308', light: '#FEF9C3' },
  { name: 'Cyan', color: '#06B6D4', light: '#CFFAFE' },
  { name: 'Teal', color: '#14B8A6', light: '#CCFBF1' }
];

// Updated NODE_TYPES with YAML Agent
const NODE_TYPES: NodeType[] = [
  {
    type: 'toolhouseInput',
    label: 'AI Input',
    icon: <Bot className="h-5 w-5" />,
    color: 'indigo',
    description: 'AI-powered input node with Toolhouse'
  },
  {
    type: 'yamlAgentNode',
    label: 'YAML Agent',
    icon: <FileText className="h-5 w-5" />,
    color: 'emerald',
    description: 'Deploy agents from YAML configuration'
  },
  {
    type: 'outputNode',
    label: 'Output',
    icon: <FileOutput className="h-5 w-5" />,
    color: 'violet',
    description: 'Displays workflow results'
  }
];

const BundlesPanel: React.FC<BundlesPanelProps> = ({
  onDragStart,
  bundles,
  onRunBundle,
  onDeleteBundle,
  onRenameBundle,
  selectedNodes,
  onCreateBundle,
  isSelectionMode,
  onToggleSelectionMode,
  onClearSelection,
  colorPalette = DEFAULT_COLOR_PALETTE,
  onChangeBundleColor
}) => {
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [selectedColor, setSelectedColor] = useState<{ name: string; color: string; light: string } | null>(null);

  const ColorPalette = ({ onColorSelect, currentColor }: { 
    onColorSelect: (color: { name: string; color: string; light: string }) => void;
    currentColor?: string;
  }) => (
    <div className="grid grid-cols-5 gap-2 p-2">
      {colorPalette.map((color) => (
        <button
          key={color.name}
          onClick={() => onColorSelect(color)}
          className={`
            w-8 h-8 rounded-lg border-2 transition-all duration-200 hover:scale-110
            ${currentColor === color.color ? 'border-slate-400 shadow-md' : 'border-transparent'}
          `}
          style={{ backgroundColor: color.color }}
          title={color.name}
        />
      ))}
    </div>
  );

  const startEditing = (bundle: Bundle) => {
    setEditingBundleId(bundle.id);
    setEditingName(bundle.name);
  };

  const saveEdit = () => {
    if (editingBundleId && editingName.trim()) {
      onRenameBundle(editingBundleId, editingName.trim());
    }
    setEditingBundleId(null);
    setEditingName('');
  };

  const cancelEdit = () => {
    setEditingBundleId(null);
    setEditingName('');
  };

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'indigo':
        return { 
          bg: 'bg-indigo-50', 
          border: 'border-indigo-200', 
          text: 'text-indigo-700',
          hover: 'hover:bg-indigo-100'
        };
      case 'violet':
        return { 
          bg: 'bg-violet-50', 
          border: 'border-violet-200', 
          text: 'text-violet-700',
          hover: 'hover:bg-violet-100'
        };
      case 'emerald':
        return { 
          bg: 'bg-emerald-50', 
          border: 'border-emerald-200', 
          text: 'text-emerald-700',
          hover: 'hover:bg-emerald-100'
        };
      default:
        return { 
          bg: 'bg-slate-50', 
          border: 'border-slate-200', 
          text: 'text-slate-700',
          hover: 'hover:bg-slate-100'
        };
    }
  };

  const getBundleColorInfo = (colorString: string) => {
    const colorInfo = colorPalette.find(c => c.color === colorString);
    return colorInfo || { name: 'Custom', color: colorString, light: '#f1f5f9' };
  };

  return (
    <div className="w-full h-full bg-white flex flex-col border-r border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 py-5 px-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white shadow-sm border border-indigo-100">
              <Layers className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Workflow</h2>
              <p className="text-xs text-slate-600">Build and manage AI workflows</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs bg-white border-slate-200">
            {bundles.length} bundles
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Bundle Creation Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
            <Group className="h-4 w-4" />
            Bundle Creation
          </h3>
          
          <div className="space-y-3">
            <Button
              onClick={onToggleSelectionMode}
              variant={isSelectionMode ? "default" : "outline"}
              className="w-full justify-start h-11 bg-gradient-to-r from-indigo-50 to-violet-50 hover:from-indigo-100 hover:to-violet-100 border-indigo-200"
              size="sm"
            >
              <Group className="h-4 w-4 mr-2" />
              {isSelectionMode ? "Exit Selection Mode" : "Select Nodes for Bundle"}
            </Button>
            
            {isSelectionMode && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-medium text-indigo-700">
                      {selectedNodes.length} nodes selected
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {selectedNodes.length > 0 && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            size="sm"
                            className="h-8 bg-indigo-600 hover:bg-indigo-700"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Create Bundle
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0" side="top">
                          <div className="p-3 border-b border-slate-100">
                            <h4 className="text-sm font-semibold text-slate-900">Choose Bundle Color</h4>
                            <p className="text-xs text-slate-500 mt-1">Select a color for your new bundle</p>
                          </div>
                          <ColorPalette 
                            onColorSelect={(color) => {
                              setSelectedColor(color);
                              onCreateBundle(color);
                            }}
                          />
                          <div className="p-3 border-t border-slate-100">
                            <Button
                              onClick={() => onCreateBundle()}
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              Create with Default Color
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    <Button
                      onClick={onClearSelection}
                      size="sm"
                      variant="ghost"
                      className="h-8 text-indigo-600 hover:text-indigo-800"
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
              Active Bundles
            </h3>
            {bundles.length > 0 && (
              <Button
                onClick={() => bundles.forEach(bundle => onRunBundle(bundle.id))}
                size="sm"
                variant="outline"
                className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                disabled={bundles.some(b => b.isRunning)}
              >
                <Play className="h-3 w-3 mr-1" />
                Run All
              </Button>
            )}
          </div>
          
          {bundles.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center">
              <div className="p-4 rounded-full bg-white border border-slate-200 w-fit mx-auto mb-3">
                <Group className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600 mb-1">No bundles created yet</p>
              <p className="text-xs text-slate-500">Select nodes and create your first bundle</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bundles.map((bundle) => {
                const bundleColor = getBundleColorInfo(bundle.color);
                return (
                  <div
                    key={bundle.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-all duration-200"
                    style={{ 
                      borderLeft: `4px solid ${bundle.color}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        {editingBundleId === bundle.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-8 text-sm font-medium"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                              }}
                            />
                            <Button
                              onClick={saveEdit}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={cancelEdit}
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <h4 className="font-semibold text-slate-900">{bundle.name}</h4>
                            <Button
                              onClick={() => startEditing(bundle)}
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {bundle.isRunning && (
                          <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 ml-2">
                            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                            Running
                          </Badge>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs bg-slate-50">
                        {bundle.nodeIds.length} nodes
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs font-medium text-slate-500">Color:</span>
                      {onChangeBundleColor ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="flex items-center gap-2 hover:bg-slate-50 rounded-lg p-1 transition-colors">
                              <div
                                className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                                style={{ backgroundColor: bundle.color }}
                              />
                              <span className="text-xs text-slate-600 font-medium">
                                {bundleColor.name}
                              </span>
                              <Palette className="h-3 w-3 text-slate-400" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0" side="top">
                            <div className="p-3 border-b border-slate-100">
                              <h4 className="text-sm font-semibold text-slate-900">Change Bundle Color</h4>
                              <p className="text-xs text-slate-500 mt-1">Select a new color for this bundle</p>
                            </div>
                            <ColorPalette 
                              onColorSelect={(color) => onChangeBundleColor(bundle.id, color)}
                              currentColor={bundle.color}
                            />
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                            style={{ backgroundColor: bundle.color }}
                          />
                          <span className="text-xs text-slate-600 font-medium">
                            {bundleColor.name}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => onRunBundle(bundle.id)}
                        disabled={bundle.isRunning}
                        size="sm"
                        className="flex-1 h-9 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
                      >
                        {bundle.isRunning ? (
                          <>
                            <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="h-3 w-3 mr-2" />
                            Run Bundle
                          </>
                        )}
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Bundle</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{bundle.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteBundle(bundle.id)} className="bg-red-600 hover:bg-red-700">
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Separator />

        {/* Components Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
            Components
          </h3>
          
          <div className="space-y-3">
            {NODE_TYPES.map((nodeType) => {
              const colors = getColorClasses(nodeType.color);
              return (
                <div
                  key={nodeType.type}
                  className={`
                    p-4 rounded-xl border-2 cursor-grab active:cursor-grabbing 
                    hover:shadow-md transition-all duration-200 ${colors.bg} ${colors.border} ${colors.hover}
                  `}
                  draggable
                  onDragStart={(event) => onDragStart(event, nodeType.type)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white border ${colors.border}`}>
                      <div className={colors.text}>
                        {nodeType.icon}
                      </div>
                    </div>
                    <div className="flex-1">
                      <span className={`text-sm font-semibold ${colors.text}`}>
                        {nodeType.label}
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        {nodeType.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
            💡 Drag components to the canvas or upload YAML files to add them to your workflow
          </p>
        </div>

        {/* Help Section */}
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-xl p-4">
          <h4 className="text-sm font-bold text-indigo-800 mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Quick Tips
          </h4>
          <ul className="text-xs text-indigo-700 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-indigo-500">•</span>
              <span>Connect AI Input, YAML Agents to Output nodes with edges</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500">•</span>
              <span>Upload YAML files to create pre-configured agent nodes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500">•</span>
              <span>Ctrl+Click to select multiple nodes for bundling</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500">•</span>
              <span>Create bundles to organize and run workflows together</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-500">•</span>
              <span>Press DEL to delete selected nodes</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BundlesPanel;