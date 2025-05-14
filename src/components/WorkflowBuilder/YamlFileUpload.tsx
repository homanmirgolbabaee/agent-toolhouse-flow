import React, { useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml')) {
      onError('Please upload a valid YAML file (.yaml or .yml)');
      return;
    }

    setIsLoading(true);
    setUploadedFile(file);

    try {
      const content = await file.text();
      const parsedAgent = yamlService.parseYamlContent(content);

      if (!parsedAgent) {
        onError('Failed to parse YAML file. Please check the file format.');
        return;
      }

      // Validate the agent configuration
      const validation = yamlService.validateAgent(parsedAgent.config);
      if (!validation.valid) {
        onError(`Invalid agent configuration:\n${validation.errors.join('\n')}`);
        return;
      }

      onYamlParsed(parsedAgent);
    } catch (error) {
      onError(`Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full">
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
            <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
            <p className="text-lg font-medium mb-2">
              {isLoading ? 'Processing...' : 'Drop your YAML file here'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Or click to browse and select a file
            </p>
            <Button variant="outline" size="sm" disabled={isLoading}>
              Choose File
            </Button>
            <p className="text-xs text-gray-400 mt-2">
              Supports .yaml and .yml files
            </p>
          </div>
        ) : (
          <div className="border border-green-200 rounded-lg p-4 bg-green-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">{uploadedFile.name}</p>
                  <p className="text-sm text-green-600">
                    {(uploadedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFile}
                className="h-8 w-8 p-0 text-green-600 hover:text-green-800 hover:bg-green-100"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".yaml,.yml"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Expected YAML Structure</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <code className="bg-blue-100 px-1 rounded">id</code>: Unique identifier for the agent</li>
                <li>• <code className="bg-blue-100 px-1 rounded">title</code>: Display name for the agent</li>
                <li>• <code className="bg-blue-100 px-1 rounded">prompt</code>: The agent's instruction prompt</li>
                <li>• <code className="bg-blue-100 px-1 rounded">vars</code>: Variables used in the prompt</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default YamlFileUpload;