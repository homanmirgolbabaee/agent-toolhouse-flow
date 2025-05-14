import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Copy, 
  CheckCircle, 
  Sparkles, 
  Code, 
  FileText, 
  Mail,
  Download,
  Share,
  ChevronUp,
  ChevronDown,
  Settings,
  ExternalLink,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import MarkdownRenderer from './MarkdownRenderer';

interface NodePropertiesProps {
  node: any | null;
  onUpdateNode: (nodeId: string, data: any) => void;
}

const NodeProperties: React.FC<NodePropertiesProps> = ({ node, onUpdateNode }) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (node) {
      setFormValues(node.data.config || {});
    }
  }, [node]);

  const handleChange = (key: string, value: any) => {
    const newFormValues = { ...formValues, [key]: value };
    setFormValues(newFormValues);
    
    const updatedData = { ...node.data, config: { ...node.data.config, ...newFormValues } };
    onUpdateNode(node.id, updatedData);
  };

  const copyToClipboard = async () => {
    if (node?.data?.output) {
      await navigator.clipboard.writeText(node.data.output);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const downloadOutput = () => {
    if (node?.data?.output) {
      const blob = new Blob([node.data.output], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-output-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const shareOutput = async () => {
    if (node?.data?.output && navigator.share) {
      try {
        await navigator.share({
          title: 'Workflow Output',
          text: node.data.output,
        });
      } catch (err) {
        console.log('Share cancelled or failed');
      }
    }
  };

  if (!node) {
    return (
      <Card className="w-full h-full bg-white border-0">
        <CardHeader className="bg-slate-50 py-4 border-b border-slate-100">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
            <Settings className="h-4 w-4 text-slate-500" />
            Properties
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 flex items-center justify-center h-full">
          <div className="text-center">
            <div className="bg-slate-50 rounded-xl p-8 border border-slate-100">
              <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-sm text-slate-600 font-medium">Select a node to edit its properties</p>
              <p className="text-xs text-slate-500 mt-2">Click on any node in the canvas to get started</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isInputNode = node.data.type === 'toolhouseInput';
  const isOutputNode = node.data.type === 'outputNode';
  const hasOutput = node.data.output && !node.data.isProcessing;

  const renderInputFields = () => (
    <div className="space-y-6">
      <div className="space-y-3">
        <Label htmlFor="prompt" className="text-sm font-semibold text-slate-700">
          Prompt
        </Label>
        <Textarea 
          id="prompt" 
          value={formValues.prompt || ''}
          onChange={(e) => handleChange('prompt', e.target.value)}
          placeholder="Describe what you want the AI to do with Toolhouse tools..."
          className="min-h-[120px] text-sm resize-none"
        />
        <p className="text-xs text-slate-500">
          Describe your task clearly for best results
        </p>
      </div>
      
      <div className="space-y-3">
        <Label htmlFor="model" className="text-sm font-semibold text-slate-700">
          Model
        </Label>
        <div className="flex items-center gap-2">
          <Input 
            id="model" 
            value={formValues.model || 'gpt-4o-mini'}
            onChange={(e) => handleChange('model', e.target.value)}
            className="text-sm"
          />
          <Badge variant="secondary" className="text-xs">
            Default
          </Badge>
        </div>
        <p className="text-xs text-slate-500">
          OpenAI model used for processing
        </p>
      </div>
    </div>
  );

  const renderOutputDisplay = () => (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold text-slate-700">
            Output
          </Label>
          {hasOutput && (
            <Badge variant="secondary" className="bg-green-50 text-green-700 text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ready
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {node.data.isProcessing && (
            <div className="flex items-center gap-2 text-blue-600 mr-2">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span className="text-xs font-medium">Processing...</span>
            </div>
          )}
          
          {hasOutput && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="h-8 w-8 p-0 hover:bg-slate-100"
                title="Copy to clipboard"
              >
                {isCopied ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 text-slate-500" />
                )}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadOutput}
                className="h-8 w-8 p-0 hover:bg-slate-100"
                title="Download as markdown"
              >
                <Download className="h-3 w-3 text-slate-500" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={shareOutput}
                className="h-8 w-8 p-0 hover:bg-slate-100"
                title="Share output"
              >
                <Share className="h-3 w-3 text-slate-500" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {}}
                className="h-8 w-8 p-0 hover:bg-slate-100"
                title="Send via email"
              >
                <Mail className="h-3 w-3 text-slate-500" />
              </Button>
              
              <Separator orientation="vertical" className="h-6 mx-1" />
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsFullScreen(!isFullScreen)}
                className="h-8 w-8 p-0 hover:bg-slate-100"
                title={isFullScreen ? "Exit fullscreen" : "Fullscreen view"}
              >
                {isFullScreen ? (
                  <Minimize2 className="h-3 w-3 text-slate-500" />
                ) : (
                  <Maximize2 className="h-3 w-3 text-slate-500" />
                )}
              </Button>
            </div>
          )}
          
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2 hover:bg-slate-100">
                {isExpanded ? (
                  <ChevronUp className="h-3 w-3 text-slate-500" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-slate-500" />
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>
      
      {/* Output content */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          {node.data.isProcessing ? (
            <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 p-8 border-blue-200">
              <div className="flex flex-col items-center justify-center text-center">
                <RefreshCw className="h-10 w-10 mb-4 animate-spin text-blue-500" />
                <span className="text-base font-medium text-blue-700 mb-2">Processing your request...</span>
                <p className="text-sm text-blue-600">This may take a few moments</p>
                <div className="mt-4 w-full max-w-xs bg-blue-100 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full animate-pulse"></div>
                </div>
              </div>
            </div>
          ) : hasOutput ? (
            <div className="rounded-lg border bg-white border-slate-200 overflow-hidden">
              <div className="border-b border-slate-100 p-3 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-slate-700">Output Generated</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{new Date().toLocaleTimeString()}</span>
                    <Badge variant="outline" className="text-xs">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Links Active
                    </Badge>
                  </div>
                </div>
              </div>
              <ScrollArea className={`${isFullScreen ? 'h-[70vh]' : 'max-h-[500px]'} p-6`}>
                <div className="prose prose-slate max-w-none">
                  <MarkdownRenderer 
                    content={node.data.output} 
                    className="text-slate-700"
                  />
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-12">
              <div className="text-center">
                <div className="bg-white rounded-full p-4 w-20 h-20 mx-auto mb-4 shadow-sm">
                  <FileText className="h-12 w-12 text-slate-400" />
                </div>
                <p className="text-base font-medium text-slate-600 mb-2">No output yet</p>
                <p className="text-sm text-slate-500">Run the workflow to generate output</p>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      {/* Enhanced quick actions */}
      {hasOutput && (
        <div className="pt-4 border-t border-slate-100">
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-700">Quick Actions</p>
              <span className="text-xs text-slate-500">Right-click links to open in new tab</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="h-9 text-sm justify-start"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Text
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadOutput}
                className="h-9 text-sm justify-start"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareOutput}
                className="h-9 text-sm justify-start"
              >
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Email functionality placeholder
                  console.log('Email functionality to be implemented');
                }}
                className="h-9 text-sm justify-start"
              >
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </Button>
            </div>
            
            {/* Additional info */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  Links are clickable
                </span>
                <span className="flex items-center gap-1">
                  <Code className="h-3 w-3" />
                  Markdown formatted
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFields = () => {
    if (isInputNode) {
      return renderInputFields();
    } else if (isOutputNode) {
      return renderOutputDisplay();
    }
    return (
      <div className="text-center py-8">
        <p className="text-sm text-slate-500">No editable properties</p>
      </div>
    );
  };

  const getHeaderIcon = () => {
    if (isInputNode) return <Sparkles className="h-4 w-4 text-blue-500" />;
    if (isOutputNode) return <Code className="h-4 w-4 text-purple-500" />;
    return <Settings className="h-4 w-4 text-slate-500" />;
  };

  return (
    <Card className="w-full h-full bg-white border-0">
      <CardHeader className="bg-slate-50 py-4 border-b border-slate-100">
        <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
          {getHeaderIcon()}
          Properties: {node.data.label}
          {node.data.isProcessing && (
            <RefreshCw className="h-3 w-3 animate-spin text-blue-500 ml-auto" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {renderFields()}
      </CardContent>
    </Card>
  );
};

export default NodeProperties;