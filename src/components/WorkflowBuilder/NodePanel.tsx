import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Code, Sparkles, Zap, Info } from 'lucide-react';

interface NodeType {
  type: string;
  label: string;
  category: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  borderColor: string;
}

interface NodePanelProps {
  onDragStart: (event: React.DragEvent<HTMLDivElement>, nodeType: string) => void;
}

const NODE_TYPES: NodeType[] = [
  {
    type: 'toolhouseInput',
    label: 'Input',
    category: 'Input',
    description: 'AI-powered input with Toolhouse tools',
    icon: <MessageSquare className="h-5 w-5" />,
    gradient: 'from-blue-50 to-indigo-100',
    borderColor: 'border-blue-200'
  },
  {
    type: 'outputNode',
    label: 'Output',
    category: 'Output',
    description: 'Display formatted workflow results',
    icon: <Code className="h-5 w-5" />,
    gradient: 'from-purple-50 to-pink-100',
    borderColor: 'border-purple-200'
  }
];

const NodePanel: React.FC<NodePanelProps> = ({ onDragStart }) => {
  return (
    <Card className="w-full h-full bg-white/50 backdrop-blur-sm border-0 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 py-4 rounded-t-lg">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-500" />
          Components
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Info className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-800">Getting Started</span>
          </div>
          <p className="text-xs text-blue-700">
            Drag components to the canvas and connect them to build your workflow
          </p>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Available Components
          </div>
          
          {NODE_TYPES.map((nodeType) => (
            <div
              key={nodeType.type}
              className={`group relative p-4 rounded-lg border-2 ${nodeType.borderColor} bg-gradient-to-br ${nodeType.gradient} cursor-grab active:cursor-grabbing hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md`}
              draggable
              onDragStart={(event) => onDragStart(event, nodeType.type)}
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                  {nodeType.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-gray-900 mb-1 flex items-center gap-2">
                    {nodeType.label}
                    {nodeType.type === 'toolhouseInput' && (
                      <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs">
                        <Zap className="h-3 w-3" />
                        <span>AI</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {nodeType.description}
                  </p>
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2 py-1 bg-white/50 text-xs text-gray-500 rounded-md border border-gray-200">
                      {nodeType.category}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Drag indicator */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-2 h-2 bg-gray-400 rounded-full mb-1"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full mb-1"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-4">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-medium text-purple-800">Powered by Toolhouse</span>
          </div>
          <p className="text-xs text-purple-700">
            Connect AI to the real world with function calling
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NodePanel;