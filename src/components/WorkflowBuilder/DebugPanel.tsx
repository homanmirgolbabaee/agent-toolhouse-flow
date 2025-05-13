
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface DebugPanelProps {
  logs: string[];
}

const DebugPanel: React.FC<DebugPanelProps> = ({ logs }) => {
  return (
    <Card className="w-full h-48 overflow-hidden flex flex-col">
      <CardHeader className="bg-muted py-3">
        <CardTitle className="text-sm">Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="p-2 flex-1 overflow-auto bg-black text-white font-mono text-xs">
        {logs.length === 0 ? (
          <div className="text-gray-500 p-2">No logs yet. Run your workflow to see debug information.</div>
        ) : (
          <pre className="p-2">
            {logs.map((log, index) => (
              <div key={index} className="pb-1">{log}</div>
            ))}
          </pre>
        )}
      </CardContent>
    </Card>
  );
};

export default DebugPanel;
