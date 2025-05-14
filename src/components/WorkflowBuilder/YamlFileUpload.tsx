import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, AlertCircle, CheckCircle, X, Eye, EyeOff, RefreshCw, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import yamlService, { ParsedAgent } from '@/services/ToolhouseYamlService';

interface YamlFileUploadProps {
  onYamlParsed: (parsedAgent: ParsedAgent) => void;
  onError: (error: string) => void;
}

const YamlFileUpload: React.FC<YamlFileUploadProps> = ({ onYamlParsed, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [parsedAgent, setParsedAgent] = useState<ParsedAgent | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
      onError('Please upload a valid YAML file (.yaml or .yml)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError('File size too large. Please upload a file smaller than 5MB.');
      return;
    }

    setIsLoading(true);
    setUploadedFile(file);
    setParsedAgent(null);
    setValidation(null);

    try {
      const content = await file.text();
      
      // Parse YAML content
      const parsed = yamlService.parseYamlContent(content);

      if (!parsed) {
        onError('Failed to parse YAML file. Please check the file format.');
        setIsLoading(false);
        return;
      }

      // Validate the agent configuration
      const validationResult = yamlService.validateAgent(parsed.config);
      setValidation(validationResult);
      setParsedAgent(parsed);

      if (!validationResult.valid) {
        onError(`Invalid agent configuration:\n${validationResult.errors.join('\n')}`);
        setIsLoading(false);
        return;
      }

      // Auto-show preview for valid files
      setShowPreview(true);
      setIsLoading(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onError(`Error reading file: ${errorMessage}`);
      setIsLoading(false);
      setParsedAgent(null);
      setValidation(null);
    }
  };

  const handleConfirmUpload = () => {
    if (parsedAgent && validation?.valid) {
      onYamlParsed(parsedAgent);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const clearFile = () => {
    setUploadedFile(null);
    setParsedAgent(null);
    setValidation(null);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderValidationResults = () => {
    if (!validation) return null;

    return (
      <div className={`border rounded-lg p-3 ${
        validation.valid 
          ? 'border-green-200 bg-green-50' 
          : 'border-red-200 bg-red-50'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          {validation.valid ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <span className={`text-sm font-semibold ${
            validation.valid ? 'text-green-800' : 'text-red-800'
          }`}>
            {validation.valid ? 'Valid Agent Configuration' : 'Configuration Errors'}
          </span>
        </div>
        {!validation.valid && (
          <ul className="text-sm text-red-700 space-y-1 ml-6">
            {validation.errors.map((error, index) => (
              <li key={index} className="list-disc">{error}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderAgentPreview = () => {
    if (!parsedAgent) return null;

    const { config, variables } = parsedAgent;

    return (
      <div className="space-y-4">
        <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Agent Details</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-slate-600">Title:</span>
              <span className="ml-2 text-slate-800">{config.title}</span>
            </div>
            <div>
              <span className="font-medium text-slate-600">ID:</span>
              <span className="ml-2 text-slate-700 font-mono text-xs">{config.id}</span>
            </div>
            <div>
              <span className="font-medium text-slate-600">Bundle:</span>
              <span className="ml-2 text-slate-700">{config.bundle || 'default'}</span>
            </div>
            <div>
              <span className="font-medium text-slate-600">Public:</span>
              <Badge variant={config.public ? 'default' : 'secondary'} className="ml-2 text-xs">
                {config.public ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">Prompt</h3>
          <div className="bg-white p-3 rounded border text-sm text-slate-700 leading-relaxed">
            {config.prompt}
          </div>
        </div>

        {variables.length > 0 && (
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Variables ({variables.length})</h3>
            <div className="space-y-2">
              {variables.map((variable, index) => (
                <div key={index} className="flex justify-between items-center text-sm bg-white p-2 rounded border">
                  <span className="font-medium text-slate-600">{variable.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{variable.type}</Badge>
                    <span className="text-slate-700">{String(variable.value)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {config.schedule && (
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <h3 className="text-sm font-semibold text-blue-800 mb-2">Schedule</h3>
            <div className="text-sm text-blue-700 font-mono">{config.schedule}</div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Upload Toolhouse Agent YAML
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!uploadedFile ? (
          <div
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 cursor-pointer
              ${isDragOver 
                ? 'border-blue-500 bg-blue-50 scale-[1.02]' 
                : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
              ${isLoading ? 'opacity-50 pointer-events-none' : ''}
            `}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            {isLoading ? (
              <RefreshCw className="h-12 w-12 mx-auto mb-4 text-blue-500 animate-spin" />
            ) : (
              <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            )}
            <p className="text-lg font-medium mb-2">
              {isLoading ? 'Processing YAML...' : 'Drop your YAML file here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Or click to browse and select a file
            </p>
            <Button variant="outline" size="sm" disabled={isLoading}>
              Choose File
            </Button>
            <p className="text-xs text-gray-400 mt-3">
              Supports .yaml and .yml files (max 5MB)
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File Summary */}
            <div className="border border-slate-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-slate-800">{uploadedFile.name}</p>
                    <p className="text-sm text-slate-600">
                      {(uploadedFile.size / 1024).toFixed(1)} KB • Uploaded {new Date().toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFile}
                  className="h-8 w-8 p-0 text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Validation Results */}
            {renderValidationResults()}

            {/* Preview Section */}
            {parsedAgent && validation?.valid && (
              <Collapsible open={showPreview} onOpenChange={setShowPreview}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Agent Preview
                    </span>
                    {showPreview ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-4 border border-slate-200 rounded-lg">
                    <ScrollArea className="max-h-96 p-4">
                      {renderAgentPreview()}
                    </ScrollArea>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Action Buttons */}
            {validation?.valid && (
              <div className="flex gap-3">
                <Button 
                  onClick={handleConfirmUpload}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Agent Node
                </Button>
                <Button 
                  variant="outline" 
                  onClick={clearFile}
                  className="px-6"
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <Separator />

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Expected YAML Structure</h4>
              <div className="text-sm text-blue-700 space-y-2">
                <p>Your YAML file should contain the following required fields:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <code className="bg-blue-100 px-2 py-1 rounded text-xs">id</code>
                    <span className="text-xs">Unique agent identifier</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-blue-100 px-2 py-1 rounded text-xs">title</code>
                    <span className="text-xs">Agent display name</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-blue-100 px-2 py-1 rounded text-xs">prompt</code>
                    <span className="text-xs">Agent instructions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="bg-blue-100 px-2 py-1 rounded text-xs">vars</code>
                    <span className="text-xs">Variable definitions</span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-100 rounded text-xs">
                  <strong>Example:</strong> See the cool-agent.yaml file for a complete example structure.
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default YamlFileUpload;