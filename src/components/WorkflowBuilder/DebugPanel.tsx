import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, Terminal, CheckCircle, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

  const getLogIcon = (log: string) => {
    if (log.includes('✅')) return <CheckCircle className="h-3 w-3 text-green-500" />;
    if (log.includes('❌')) return <AlertCircle className="h-3 w-3 text-red-500" />;
    if (log.includes('🔧') || log.includes('🛠️')) return <RefreshCw className="h-3 w-3 text-blue-500" />;
    if (log.includes('⚡')) return <Zap className="h-3 w-3 text-yellow-500" />;
    return <Terminal className="h-3 w-3 text-gray-400" />;
  };

  const formatLogText = (log: string) => {
    return log.replace(/[🔧🛠️✅❌⚡🚀]/g, '').trim();
  };

  return (
    <Card className={`w-full bg-white border-t border-slate-200 ${expanded ? 'h-64' : 'h-12'} overflow-hidden flex flex-col transition-all duration-300 rounded-none`}>
      <CardHeader className="bg-slate-50 border-b border-slate-100 py-3 px-4 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
          <Terminal className="h-4 w-4" />
          Debug Console
          {logs.length > 0 && (
            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
              {logs.length} logs
            </Badge>
          )}
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onToggleExpand} 
          className="h-8 w-8 p-0"
        >
          {expanded ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
        </Button>
      </CardHeader>
      
      <Collapsible open={expanded}>
        <CollapsibleContent>
          <CardContent className="p-0 h-48 overflow-auto bg-slate-900 text-gray-100 font-mono text-xs">
            {logs.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Terminal className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">No logs yet</p>
                  <p className="text-gray-600 text-xs">Run your workflow to see debug information</p>
                </div>
              </div>
            ) : (
              <div className="p-3 space-y-1">
                {logs.slice().reverse().map((log, index) => (
                  <div key={index} className="flex items-start gap-2 py-1 hover:bg-slate-800/50 rounded px-2 -mx-2">
                    <div className="flex-shrink-0 mt-0.5">
                      {getLogIcon(log)}
                    </div>
                    <div className="flex-1 break-all">
                      <span className={`${
                        log.includes('✅') ? 'text-green-400' :
                        log.includes('❌') ? 'text-red-400' :
                        log.includes('🔧') || log.includes('🛠️') ? 'text-blue-400' :
                        log.includes('⚡') ? 'text-yellow-400' :
                        'text-gray-300'
                      }`}>
                        {formatLogText(log)}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default DebugPanel;