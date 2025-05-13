
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';

interface NodePropertiesProps {
  node: any | null;
  onUpdateNode: (nodeId: string, data: any) => void;
}

const NodeProperties: React.FC<NodePropertiesProps> = ({ node, onUpdateNode }) => {
  const [formValues, setFormValues] = useState<Record<string, any>>({});

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
    if (node.type === 'toolhouseInput') {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="prompt">Prompt</Label>
            <Input 
              id="prompt" 
              defaultValue={node.data.config?.prompt || ''} 
              onChange={(e) => handleChange('prompt', e.target.value)}
            />
          </div>
        </>
      );
    }
    
    if (node.type === 'toolhouseTool') {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="toolName">Tool Name</Label>
            <Input 
              id="toolName" 
              defaultValue={node.data.config?.toolName || ''} 
              onChange={(e) => handleChange('toolName', e.target.value)}
            />
          </div>
          <div className="space-y-2 mt-4">
            <Label htmlFor="params">Parameters (JSON)</Label>
            <Input 
              id="params" 
              defaultValue={node.data.config?.params || '{}'} 
              onChange={(e) => handleChange('params', e.target.value)}
            />
          </div>
        </>
      );
    }
    
    if (node.type === 'llmNode') {
      return (
        <>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input 
              id="model" 
              defaultValue={node.data.config?.model || 'gpt-4o-mini'} 
              onChange={(e) => handleChange('model', e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2 mt-4">
            <Checkbox 
              id="useTools" 
              defaultChecked={node.data.config?.useTools || true}
              onCheckedChange={(checked) => handleChange('useTools', checked)}
            />
            <label htmlFor="useTools" className="text-sm">Use Toolhouse Tools</label>
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
        <div className="mt-4">
          <Button 
            size="sm" 
            variant="outline" 
            className="w-full"
          >
            Apply Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default NodeProperties;
