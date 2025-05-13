
import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface DebugPanelProps {
  logs: string[];
  expanded: boolean;
  onToggleExpand: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ logs, expanded, onToggleExpand }) => {
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (expanded && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, expanded]);

  return (
    <Card className={`w-full ${expanded ? 'h-64' : 'h-12'} overflow-hidden flex flex-col transition-all duration-300`}>
      <CardHeader className="bg-muted py-2 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Debug Panel</CardTitle>
        <Button variant="ghost" size="sm" onClick={onToggleExpand} className="h-6 w-6 p-0">
          {expanded ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <Collapsible open={expanded}>
        <CollapsibleContent>
          <CardContent className="p-2 h-48 overflow-auto bg-black text-white font-mono text-xs">
            {logs.length === 0 ? (
              <div className="text-gray-500 p-2">No logs yet. Run your workflow to see debug information.</div>
            ) : (
              <pre className="p-2">
                {logs.map((log, index) => (
                  <div key={index} className="pb-1">{log}</div>
                ))}
                <div ref={logsEndRef} />
              </pre>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default DebugPanel;
