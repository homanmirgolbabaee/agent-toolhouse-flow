import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
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
  Minimize2,
  PanelTop,
  PanelBottom,
  MoreHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import MarkdownRenderer from './MarkdownRenderer';

interface NodePropertiesProps {
  node: any | null;
  onUpdateNode: (nodeId: string, data: any) => void;
}

const NodePropertiesAdvanced: React.FC<NodePropertiesProps> = ({ node, onUpdateNode }) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [activeTab, setActiveTab] = useState('output');
  const [panelLayout, setPanelLayout] = useState<'horizontal' | 'vertical'>('vertical');

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
              <p className="text-sm text-slate-600 font-medium">Select a node to view its properties</p>
              <p className="text-xs text-slate-500 mt-2">Click on any node in the canvas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isInputNode = node.data.type === 'toolhouseInput';
  const isOutputNode = node.data.type === 'outputNode';
  const isYamlAgentNode = node.data.type === 'yamlAgentNode';
  const hasOutput = node.data.output && !node.data.isProcessing;

  // Render input node properties
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

  // Render YAML agent node properties
  const renderYamlAgentFields = () => (
    <div className="space-y-6">
      {node.data.config?.agentConfig ? (
        <>
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700">Agent Configuration</Label>
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="font-medium text-slate-500">Title:</span>
                  <p className="text-slate-700 mt-1">{node.data.config.agentConfig.title}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-500">ID:</span>
                  <p className="text-slate-700 mt-1 font-mono">{node.data.config.agentConfig.id}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-500">Bundle:</span>
                  <p className="text-slate-700 mt-1">{node.data.config.agentConfig.bundle || 'default'}</p>
                </div>
                <div>
                  <span className="font-medium text-slate-500">Public:</span>
                  <p className="text-slate-700 mt-1">{node.data.config.agentConfig.public ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-semibold text-slate-700">Prompt</Label>
            <div className="bg-white p-3 rounded border text-sm text-slate-700 max-h-32 overflow-y-auto">
              {node.data.config.agentConfig.prompt}
            </div>
          </div>

          {Object.keys(node.data.config.variables || {}).length > 0 && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold text-slate-700">Variables</Label>
              <div className="space-y-2">
                {Object.entries(node.data.config.variables).map(([key, value]) => (
                  <div key={key} className="flex items-center gap-3 p-3 bg-slate-50 rounded border">
                    <span className="text-sm font-medium text-slate-600 min-w-0 flex-1">{key}:</span>
                    <span className="text-sm text-slate-700 flex-2">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm font-semibold text-orange-700">No YAML Configuration</p>
              <p className="text-xs text-orange-600">Upload a YAML file to configure this agent</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderOutputToolbar = () => (
    <div className="flex items-center justify-between p-3 border-b border-slate-100 bg-slate-50">
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
        {node.data.isProcessing && (
          <Badge variant="secondary" className="bg-blue-50 text-blue-700 text-xs">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Processing
          </Badge>
        )}
      </div>
      
      <div className="flex items-center gap-1">
        {hasOutput && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-8 w-8 p-0 hover:bg-white"
              title="Copy to clipboard"
            >
              {isCopied ? (
                <CheckCircle className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-slate-500" />
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-white"
                >
                  <MoreHorizontal className="h-3 w-3 text-slate-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="bottom">
                <DropdownMenuItem onClick={downloadOutput}>
                  <Download className="h-3 w-3 mr-2" />
                  Download as Markdown
                </DropdownMenuItem>
                <DropdownMenuItem onClick={shareOutput}>
                  <Share className="h-3 w-3 mr-2" />
                  Share Output
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => console.log('Email functionality')}>
                  <Mail className="h-3 w-3 mr-2" />
                  Send via Email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPanelLayout(panelLayout === 'vertical' ? 'horizontal' : 'vertical')}>
                  {panelLayout === 'vertical' ? (
                    <>
                      <PanelTop className="h-3 w-3 mr-2" />
                      Horizontal Layout
                    </>
                  ) : (
                    <>
                      <PanelBottom className="h-3 w-3 mr-2" />
                      Vertical Layout
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Separator orientation="vertical" className="h-6 mx-1" />
          </>
        )}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="h-8 w-8 p-0 hover:bg-white"
          title={isFullScreen ? "Exit fullscreen" : "Fullscreen view"}
        >
          {isFullScreen ? (
            <Minimize2 className="h-3 w-3 text-slate-500" />
          ) : (
            <Maximize2 className="h-3 w-3 text-slate-500" />
          )}
        </Button>
      </div>
    </div>
  );

  const renderOutputContent = () => (
    <div className="h-full flex flex-col">
      {renderOutputToolbar()}
      
      {node.data.isProcessing ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 mb-4 animate-spin text-blue-500 mx-auto" />
            <span className="text-lg font-medium text-blue-700 block mb-2">Processing your request...</span>
            <p className="text-sm text-blue-600">This may take a few moments</p>
            <div className="mt-4 w-64 bg-blue-100 rounded-full h-2 overflow-hidden mx-auto">
              <div className="h-full bg-blue-500 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      ) : hasOutput ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-white">
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
          
          <ScrollArea className={`flex-1 p-4 ${isFullScreen ? 'h-[80vh]' : ''}`}>
            <div className="prose prose-slate max-w-none">
              <MarkdownRenderer 
                content={node.data.output} 
                className="text-slate-700"
              />
            </div>
          </ScrollArea>
          
          {/* Quick Actions */}
          <div className="border-t border-slate-100 p-3 bg-slate-50">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
                className="h-9 text-sm justify-start"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy
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
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <div className="bg-slate-100 rounded-full p-4 w-20 h-20 mx-auto mb-4">
              <FileText className="h-12 w-12 text-slate-400" />
            </div>
            <p className="text-base font-medium text-slate-600 mb-2">No output yet</p>
            <p className="text-sm text-slate-500">Run the workflow to generate output</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderMetadata = () => (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-700">Node Information</h3>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Type:</span>
          <span className="text-slate-700 font-medium">{node.data.type}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">ID:</span>
          <span className="text-slate-700 font-mono">{node.id}</span>
        </div>
        {node.data.bundleId && (
          <div className="flex justify-between">
            <span className="text-slate-500">Bundle:</span>
            <span className="text-slate-700 font-medium">{node.data.bundleId}</span>
          </div>
        )}
      </div>
    </div>
  );

  const getHeaderIcon = () => {
    if (isInputNode) return <Sparkles className="h-4 w-4 text-blue-500" />;
    if (isOutputNode) return <Code className="h-4 w-4 text-purple-500" />;
    if (isYamlAgentNode) return <FileText className="h-4 w-4 text-emerald-500" />;
    return <Settings className="h-4 w-4 text-slate-500" />;
  };

  // Main render logic for different node types
  const renderPropertiesContent = () => {
    if (isInputNode) {
      return renderInputFields();
    } else if (isYamlAgentNode) {
      return renderYamlAgentFields();
    } else {
      // For other node types, show basic info
      return (
        <div className="p-4 text-center">
          <p className="text-sm text-slate-500">No configurable properties for this node type</p>
        </div>
      );
    }
  };

  // Special layout for output nodes
  if (isOutputNode) {
    return (
      <Card className="w-full h-full bg-white border-0 flex flex-col overflow-hidden">
        <CardHeader className="bg-slate-50 py-4 border-b border-slate-100 flex-shrink-0">
          <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
            {getHeaderIcon()}
            Properties: {node.data.label}
            {node.data.isProcessing && (
              <RefreshCw className="h-3 w-3 animate-spin text-blue-500 ml-auto" />
            )}
          </CardTitle>
        </CardHeader>
        
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 m-2">
              <TabsTrigger value="output" className="text-xs">Output</TabsTrigger>
              <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
            </TabsList>
            
            <TabsContent value="output" className="flex-1 mt-0 overflow-hidden">
              {renderOutputContent()}
            </TabsContent>
            
            <TabsContent value="info" className="flex-1 mt-0">
              {renderMetadata()}
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    );
  }

  // Standard layout for input and other nodes
  return (
    <Card className="w-full h-full bg-white border-0 flex flex-col overflow-hidden">
      <CardHeader className="bg-slate-50 py-4 border-b border-slate-100 flex-shrink-0">
        <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
          {getHeaderIcon()}
          Properties: {node.data.label}
          {node.data.isProcessing && (
            <RefreshCw className="h-3 w-3 animate-spin text-blue-500 ml-auto" />
          )}
        </CardTitle>
      </CardHeader>
      
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2 m-2">
            <TabsTrigger value="properties" className="text-xs">Properties</TabsTrigger>
            <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
          </TabsList>
          
          <TabsContent value="properties" className="flex-1 mt-0 overflow-auto">
            <ScrollArea className="h-full">
              {renderPropertiesContent()}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="info" className="flex-1 mt-0">
            {renderMetadata()}
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};

export default NodePropertiesAdvanced;  