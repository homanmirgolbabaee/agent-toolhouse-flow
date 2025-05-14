import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Code, Sparkles, Zap, Info, Layers, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
    gradient: 'from-blue-50 to-blue-100',
    borderColor: 'border-blue-200'
  },
  {
    type: 'outputNode',
    label: 'Output',
    category: 'Output',
    description: 'Display and manage workflow results',
    icon: <Code className="h-5 w-5" />,
    gradient: 'from-purple-50 to-purple-100',
    borderColor: 'border-purple-200'
  }
];

const NodePanel: React.FC<NodePanelProps> = ({ onDragStart }) => {
  return (
    <Card className="w-full h-full bg-white border-0">
      <CardHeader className="bg-slate-50 py-4 border-b border-slate-100">
        <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
          <Layers className="h-4 w-4 text-blue-500" />
          Components
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Getting Started */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 rounded-lg p-2">
              <Info className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-800 mb-1">Getting Started</h3>
              <p className="text-xs text-blue-700 leading-relaxed">
                Drag components to the canvas and connect them
              </p>
              <div className="flex items-center gap-1 mt-2 text-xs text-blue-600">
                <span>Drag</span>
                <ArrowRight className="h-3 w-3" />
                <span>Connect</span>
                <ArrowRight className="h-3 w-3" />
                <span>Run</span>
              </div>
            </div>
          </div>
        </div>

        {/* Components */}
        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Available Components
          </div>
          
          {NODE_TYPES.map((nodeType) => (
            <div
              key={nodeType.type}
              className={`
                group p-4 rounded-lg border-2 ${nodeType.borderColor} 
                bg-gradient-to-br ${nodeType.gradient} cursor-grab active:cursor-grabbing 
                hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md
              `}
              draggable
              onDragStart={(event) => onDragStart(event, nodeType.type)}
            >
              <div className="flex items-start gap-3">
                <div className="bg-white rounded-lg p-3 shadow-sm group-hover:shadow-md transition-shadow">
                  <div className={nodeType.type === 'toolhouseInput' ? 'text-blue-600' : 'text-purple-600'}>
                    {nodeType.icon}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-sm text-slate-900">
                      {nodeType.label}
                    </h4>
                    {nodeType.type === 'toolhouseInput' && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs">
                        <Zap className="h-3 w-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed mb-2">
                    {nodeType.description}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {nodeType.category}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Powered by Toolhouse */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-purple-800 mb-1">
                Powered by Toolhouse
              </h3>
              <p className="text-xs text-purple-700 leading-relaxed">
                Connect AI to the real world with function calling
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default NodePanel;