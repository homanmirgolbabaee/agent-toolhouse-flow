import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Check } from 'lucide-react';

interface BundleCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBundle: (name: string, color: { name: string; color: string; light: string }) => void;
  selectedNodesCount: number;
}

// Extended color palette with more options
const EXTENDED_COLOR_PALETTE = [
  // Primary colors
  { name: 'Ocean Blue', color: '#0EA5E9', light: '#E0F2FE' },
  { name: 'Indigo', color: '#6366F1', light: '#E0E7FF' },
  { name: 'Purple', color: '#8B5CF6', light: '#EDE9FE' },
  { name: 'Emerald', color: '#10B981', light: '#D1FAE5' },
  { name: 'Orange', color: '#F59E0B', light: '#FEF3C7' },
  { name: 'Rose', color: '#F43F5E', light: '#FFE4E6' },
  
  // Secondary colors
  { name: 'Teal', color: '#14B8A6', light: '#CCFBF1' },
  { name: 'Violet', color: '#7C3AED', light: '#EDE9FE' },
  { name: 'Cyan', color: '#06B6D4', light: '#CFFAFE' },
  { name: 'Lime', color: '#84CC16', light: '#ECFCCB' },
  { name: 'Pink', color: '#EC4899', light: '#FCE7F3' },
  { name: 'Red', color: '#EF4444', light: '#FEE2E2' },
  
  // Neutral colors
  { name: 'Slate', color: '#64748B', light: '#F1F5F9' },
  { name: 'Zinc', color: '#71717A', light: '#F4F4F5' },
  { name: 'Stone', color: '#78716C', light: '#F5F5F4' },
  { name: 'Amber', color: '#F59E0B', light: '#FEF3C7' },
];

export function BundleCreationDialog({ 
  isOpen, 
  onClose, 
  onCreateBundle, 
  selectedNodesCount 
}: BundleCreationDialogProps) {
  const [bundleName, setBundleName] = useState('');
  const [selectedColor, setSelectedColor] = useState(EXTENDED_COLOR_PALETTE[0]);
  const [customColor, setCustomColor] = useState('#4F46E5');
  const [useCustomColor, setUseCustomColor] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalColor = useCustomColor 
      ? { name: 'Custom', color: customColor, light: `${customColor}20` }
      : selectedColor;
    
    const finalName = bundleName.trim() || `Bundle ${Date.now()}`;
    
    onCreateBundle(finalName, finalColor);
    onClose();
    
    // Reset form
    setBundleName('');
    setSelectedColor(EXTENDED_COLOR_PALETTE[0]);
    setCustomColor('#4F46E5');
    setUseCustomColor(false);
  };

  const handleClose = () => {
    onClose();
    // Reset form
    setBundleName('');
    setSelectedColor(EXTENDED_COLOR_PALETTE[0]);
    setCustomColor('#4F46E5');
    setUseCustomColor(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            Create Bundle
          </DialogTitle>
          <DialogDescription>
            Create a bundle with {selectedNodesCount} selected nodes. Choose a name and color to organize your workflow.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bundle Name */}
          <div className="space-y-2">
            <Label htmlFor="bundle-name">Bundle Name</Label>
            <Input
              id="bundle-name"
              placeholder="Enter bundle name..."
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              className="w-full"
            />
          </div>
          
          {/* Color Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Choose Color</Label>
            
            {/* Preset Colors */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="preset-colors"
                  name="color-type"
                  checked={!useCustomColor}
                  onChange={() => setUseCustomColor(false)}
                  className="text-blue-600"
                />
                <Label htmlFor="preset-colors" className="text-sm">Preset Colors</Label>
              </div>
              
              <div className="grid grid-cols-8 gap-2">
                {EXTENDED_COLOR_PALETTE.map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => {
                      setSelectedColor(color);
                      setUseCustomColor(false);
                    }}
                    className={`
                      w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110
                      ${!useCustomColor && selectedColor.color === color.color 
                        ? 'border-slate-400 shadow-md ring-2 ring-blue-500 ring-opacity-50' 
                        : 'border-transparent hover:border-slate-300'}
                    `}
                    style={{ backgroundColor: color.color }}
                    title={color.name}
                    disabled={useCustomColor}
                  />
                ))}
              </div>
              
              {!useCustomColor && (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">{selectedColor.name}</span>
                  <div 
                    className="w-4 h-4 rounded border border-slate-300" 
                    style={{ backgroundColor: selectedColor.color }}
                  />
                </div>
              )}
            </div>
            
            {/* Custom Color */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  id="custom-color"
                  name="color-type"
                  checked={useCustomColor}
                  onChange={() => setUseCustomColor(true)}
                  className="text-blue-600"
                />
                <Label htmlFor="custom-color" className="text-sm">Custom Color</Label>
              </div>
              
              {useCustomColor && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center border rounded-lg overflow-hidden">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="w-12 h-10 border-none cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="border-none shadow-none w-24"
                      placeholder="#4F46E5"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Preview:</span>
                    <div 
                      className="w-8 h-8 rounded border border-slate-300" 
                      style={{ backgroundColor: customColor }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Selected Nodes Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200">
                {selectedNodesCount} nodes
              </Badge>
              <span className="text-sm text-blue-700 dark:text-blue-300">will be included in this bundle</span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              <Sparkles className="h-4 w-4 mr-2" />
              Create Bundle
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}