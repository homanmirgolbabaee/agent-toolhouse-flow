
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NodePropertiesProps {
  node: any | null;
  onUpdateNode: (nodeId: string, data: any) => void;
}

const NodeProperties: React.FC<NodePropertiesProps> = ({ node, onUpdateNode }) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (node) {
      setFormValues(node.data.config || {});
    }
  }, [node]);

  if (!node) {
    return (
      <Card className="w-64">
        <CardHeader className="bg-muted py-3">
          <CardTitle className="text-sm">Properties</CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Select a node to edit its properties
        </CardContent>
      </Card>
    );
  }

  const handleChange = (key: string, value: any) => {
    const newFormValues = { ...formValues, [key]: value };
    setFormValues(newFormValues);
    
    // Update the node data
    const updatedData = { ...node.data, config: { ...node.data.config, ...newFormValues } };
    onUpdateNode(node.id, updatedData);
  };

  const renderFields = () => {
    if (node.data.type === 'toolhouseInput') {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Textarea 
              id="prompt" 
              value={formValues.prompt || ''}
              onChange={(e) => handleChange('prompt', e.target.value)}
              placeholder="Enter your prompt here..."
              className="min-h-[120px]"
            />
          </div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="model">Model</Label>
            <Input 
              id="model" 
              value={formValues.model || 'gpt-4o-mini'}
              onChange={(e) => handleChange('model', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Model to use for processing</p>
          </div>
        </>
      );
    }
    
    if (node.data.type === 'outputNode') {
      return (
        <>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="output">Output</Label>
              <div className="flex items-center gap-2">
                {node.data.isProcessing && (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                )}
                <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      {isOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="rounded border bg-muted p-3 mt-2">
                      {node.data.isProcessing ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          <span className="text-xs">Processing...</span>
                        </div>
                      ) : (
                        <pre className="text-xs whitespace-pre-wrap break-words">
                          {typeof node.data.output === 'string' ? node.data.output : JSON.stringify(node.data.output, null, 2)}
                        </pre>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </div>
            {!node.data.output && !node.data.isProcessing && (
              <div className="text-sm text-muted-foreground">
                No output data yet. Run the workflow to generate output.
              </div>
            )}
          </div>
        </>
      );
    }
    
    return <div className="text-sm text-muted-foreground">No editable properties</div>;
  };

  return (
    <Card className="w-64">
      <CardHeader className="bg-muted py-3">
        <CardTitle className="text-sm">Properties: {node.data.label}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {renderFields()}
      </CardContent>
    </Card>
  );
};

export default NodeProperties;
