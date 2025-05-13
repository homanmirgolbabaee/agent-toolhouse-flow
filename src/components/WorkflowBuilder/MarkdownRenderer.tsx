import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Eye, EyeOff, RefreshCw, Copy, CheckCircle, Sparkles, Code, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MarkdownRenderer from './MarkdownRenderer';

interface NodePropertiesProps {
  node: any | null;
  onUpdateNode: (nodeId: string, data: any) => void;
}

const NodeProperties: React.FC<NodePropertiesProps> = ({ node, onUpdateNode }) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [isOpen, setIsOpen] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (node) {
      setFormValues(node.data.config || {});
    }
  }, [node]);

  const handleChange = (key: string, value: any) => {
    const newFormValues = { ...formValues, [key]: value };
    setFormValues(newFormValues);
    
    // Update the node data
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

  if (!node) {
    return (
      <Card className="w-full h-full bg-white/50 backdrop-blur-sm border-0 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 py-4 rounded-t-lg">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Properties
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 text-center">
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Select a node to edit its properties</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isInputNode = node.data.type === 'toolhouseInput';
  const isOutputNode = node.data.type === 'outputNode';

  const renderInputFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="prompt" className="text-sm font-medium text-gray-700">Prompt</Label>
        <Textarea 
          id="prompt" 
          value={formValues.prompt || ''}
          onChange={(e) => handleChange('prompt', e.target.value)}
          placeholder="Enter your prompt here..."
          className="min-h-[120px] bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200"
        />
        <p className="text-xs text-gray-500">Describe what you want the AI to do with Toolhouse tools</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="model" className="text-sm font-medium text-gray-700">Model</Label>
        <Input 
          id="model" 
          value={formValues.model || 'gpt-4o-mini'}
          onChange={(e) => handleChange('model', e.target.value)}
          className="bg-white border-gray-200 focus:border-blue-300 focus:ring-blue-200"
        />
        <p className="text-xs text-gray-500">OpenAI model to use for processing</p>
      </div>
    </div>
  );

  const renderOutputDisplay = () => (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <Code className="h-4 w-4" />
          Output
        </Label>
        <div className="flex items-center gap-2">
          {node.data.isProcessing && (
            <div className="flex items-center gap-2 text-blue-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-xs">Processing...</span>
            </div>
          )}
          {node.data.output && !node.data.isProcessing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-8 px-2"
            >
              {isCopied ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          )}
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          {node.data.isProcessing ? (
            <div className="rounded-lg border bg-blue-50 p-4">
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 mr-3 animate-spin text-blue-500" />
                <span className="text-sm text-blue-700">Processing your request...</span>
              </div>
            </div>
          ) : node.data.output ? (
            <div className="rounded-lg border bg-white shadow-sm">
              <div className="p-4 max-h-[400px] overflow-y-auto">
                <MarkdownRenderer content={node.data.output} />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No output data yet</p>
                <p className="text-xs text-gray-400 mt-1">Run the workflow to generate output</p>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
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
        <p className="text-sm text-gray-500">No editable properties</p>
      </div>
    );
  };

  return (
    <Card className="w-full h-full bg-white/50 backdrop-blur-sm border-0 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 py-4 rounded-t-lg">
        <CardTitle className="text-sm flex items-center gap-2">
          {isInputNode && <Sparkles className="h-4 w-4 text-blue-500" />}
          {isOutputNode && <Code className="h-4 w-4 text-purple-500" />}
          {!isInputNode && !isOutputNode && <FileText className="h-4 w-4" />}
          Properties: {node.data.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {renderFields()}
      </CardContent>
    </Card>
  );
};

export default NodeProperties;