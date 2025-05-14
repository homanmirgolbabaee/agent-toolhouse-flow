import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  ConnectionLineType,
  Connection,
  Edge,
  Node,
  useNodesState,
  useEdgesState,
  Panel,
  useReactFlow,
  ReactFlowInstance,
  ReactFlowProvider
} from 'reactflow';
import 'reactflow/dist/style.css';

import CustomNode from './Node';
import NodePanel from './NodePanel';
import NodeProperties from './NodeProperties';
import DebugPanel from './DebugPanel';
import { Button } from '@/components/ui/button';
import { Play, Sparkles, RefreshCw, Group, Square, CheckSquare, Link, Zap, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { Input } from '@/components/ui/input';
import toolhouseService from '../../services/ToolhouseService';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';
import BundlesPanel from './NodePanel';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import NodePropertiesAdvanced from './NodeProperties';

interface Bundle {
  id: string;
  name: string;
  nodeIds: string[];
  color: string;
  isRunning: boolean;
}

const nodeTypes = {
  customNode: CustomNode,
};

const BUNDLE_COLORS = [
  '#e3f2fd',
  '#f3e5f5',
  '#e8f5e9',
  '#fff3e0',
  '#fce4ec',
];

const WorkflowBuilderInner: React.FC = () => {
  const { toast: uiToast } = useToast();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [toolhouseApiKey, setToolhouseApiKey] = useState<string>('');
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugExpanded, setDebugExpanded] = useState(false);
  
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [nextBundleId, setNextBundleId] = useState(1);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const { getNodes } = useReactFlow();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#3b82f6', strokeWidth: 2 }
    }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (isSelectionMode) {
      setSelectedNodes(prev => 
        prev.includes(node.id) 
          ? prev.filter(id => id !== node.id)
          : [...prev, node.id]
      );
    } else {
      setSelectedNode(node);
    }
  }, [isSelectionMode]);

  const onPaneClick = useCallback(() => {
    if (!isSelectionMode) {
      setSelectedNode(null);
    }
  }, [isSelectionMode]);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      if (reactFlowInstance && reactFlowBounds) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const newNode = {
          id: `${type}_${Date.now()}`,
          type: 'customNode',
          position,
          data: { 
            label: getNodeLabel(type),
            type: type,
            config: getDefaultConfig(type),
            bundleId: null
          },
        };

        setNodes((nds) => nds.concat(newNode));
      }
    },
    [reactFlowInstance, setNodes]
  );

  const getDefaultConfig = (type: string) => {
    switch(type) {
      case 'toolhouseInput':
        return { 
          prompt: "Generate a Python FizzBuzz program and execute it to show results up to 15.", 
          model: "gpt-4o-mini" 
        };
      default:
        return {};
    }
  };

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const getNodeLabel = (type: string): string => {
    switch (type) {
      case 'toolhouseInput':
        return 'Input';
      case 'outputNode':
        return 'Output';
      default:
        return 'Node';
    }
  };

  const updateNode = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, ...data } };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  const addLog = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    setLogs((prevLogs) => [`[${timestamp}] ${message}`, ...prevLogs]);
  };

  const createBundle = () => {
    if (selectedNodes.length === 0) {
      uiToast({
        title: "No Nodes Selected",
        description: "Please select nodes to create a bundle",
        variant: "destructive"
      });
      return;
    }

    const bundleId = `bundle_${nextBundleId}`;
    const newBundle: Bundle = {
      id: bundleId,
      name: `Bundle ${nextBundleId}`,
      nodeIds: [...selectedNodes],
      color: BUNDLE_COLORS[(nextBundleId - 1) % BUNDLE_COLORS.length],
      isRunning: false
    };

    setNodes(nds => nds.map(node => {
      if (selectedNodes.includes(node.id)) {
        return {
          ...node,
          data: { ...node.data, bundleId },
          style: { 
            ...node.style, 
            backgroundColor: newBundle.color,
            border: `2px solid ${newBundle.color.replace('f', 'c')}`,
          }
        };
      }
      return node;
    }));

    setBundles(prev => [...prev, newBundle]);
    setNextBundleId(prev => prev + 1);
    setSelectedNodes([]);
    setIsSelectionMode(false);

    uiToast({
      title: "Bundle Created",
      description: `Created ${newBundle.name} with ${selectedNodes.length} nodes`,
    });
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedNodes([]);
  };

  const clearSelection = () => {
    setSelectedNodes([]);
    setIsSelectionMode(false);
  };

  const deleteBundle = (bundleId: string) => {
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) return;

    setNodes(nds => nds.map(node => {
      if (bundle.nodeIds.includes(node.id)) {
        const { bundleId, ...data } = node.data;
        return {
          ...node,
          data,
          style: { ...node.style, backgroundColor: undefined, border: undefined }
        };
      }
      return node;
    }));

    setBundles(prev => prev.filter(b => b.id !== bundleId));
    
    uiToast({
      title: "Bundle Deleted",
      description: `Deleted ${bundle.name}`,
    });
  };

  const findNodesByType = (nodeIds: string[], type: string) => {
    return nodes.filter(node => nodeIds.includes(node.id) && node.data.type === type);
  };

  const getConnectedNodes = (nodeId: string, direction: 'source' | 'target') => {
    const connectedEdges = edges.filter(edge => 
      direction === 'source' ? edge.source === nodeId : edge.target === nodeId
    );
    
    return connectedEdges.map(edge => {
      const connectedNodeId = direction === 'source' ? edge.target : edge.source;
      return nodes.find(node => node.id === connectedNodeId);
    }).filter(Boolean) as Node[];
  };

  const initializeToolhouse = async () => {
    if (!toolhouseApiKey) {
      uiToast({
        title: "API Key Required",
        description: "Please enter a Toolhouse API key",
        variant: "destructive"
      });
      return false;
    }
    
    if (!openaiApiKey) {
      uiToast({
        title: "API Key Required",  
        description: "Please enter an OpenAI API key",
        variant: "destructive"
      });
      return false;
    }
    
    addLog('🔧 Initializing Toolhouse and OpenAI...');
    const success = await toolhouseService.initialize(toolhouseApiKey, openaiApiKey, { id: 'workflow-builder' });
    
    if (success) {
      addLog('✅ Toolhouse and OpenAI initialized successfully');
      const tools = await toolhouseService.getTools();
      addLog(`🛠️ Retrieved ${tools.length} available tools`);
      return true;
    } else {
      addLog('❌ Failed to initialize Toolhouse or OpenAI');
      uiToast({
        title: "Initialization Failed",
        description: "Failed to initialize API clients. Check your API keys and try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const runBundle = async (bundleId: string) => {
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) return;

    setBundles(prev => prev.map(b => 
      b.id === bundleId ? { ...b, isRunning: true } : b
    ));

    setDebugExpanded(true);

    try {
      if (!toolhouseService.isInitialized()) {
        const initialized = await initializeToolhouse();
        if (!initialized) {
          setBundles(prev => prev.map(b => 
            b.id === bundleId ? { ...b, isRunning: false } : b
          ));
          return;
        }
      }
      
      addLog(`🚀 Running ${bundle.name}...`);
      
      const inputNodes = findNodesByType(bundle.nodeIds, 'toolhouseInput');
      const outputNodes = findNodesByType(bundle.nodeIds, 'outputNode');
      
      if (inputNodes.length === 0) {
        addLog(`❌ Error: No input node found in ${bundle.name}`);
        uiToast({
          title: "Missing Input",
          description: `No input node found in ${bundle.name}`,
          variant: "destructive"
        });
        setBundles(prev => prev.map(b => 
          b.id === bundleId ? { ...b, isRunning: false } : b
        ));
        return;
      }
      
      if (outputNodes.length === 0) {
        addLog(`❌ Error: No output node found in ${bundle.name}`);
        uiToast({
          title: "Missing Output",
          description: `No output node found in ${bundle.name}`,
          variant: "destructive"
        });
        setBundles(prev => prev.map(b => 
          b.id === bundleId ? { ...b, isRunning: false } : b
        ));
        return;
      }
      
      for (const inputNode of inputNodes) {
        const connectedOutputs = getConnectedNodes(inputNode.id, 'source');
        const outputNode = connectedOutputs.find(node => 
          node.data.type === 'outputNode' && bundle.nodeIds.includes(node.id)
        );
        
        if (!outputNode) {
          addLog(`❌ Error: Input node in ${bundle.name} is not connected to an output node`);
          continue;
        }
        
        try {
          const prompt = inputNode.data.config.prompt;
          const model = inputNode.data.config.model || 'gpt-4o-mini';
          
          addLog(`⚡ Processing input in ${bundle.name}: "${prompt.substring(0, 50)}..."`);
          
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === outputNode.id) {
                return { 
                  ...node, 
                  data: { 
                    ...node.data, 
                    output: "🔄 Processing...",
                    isProcessing: true
                  } 
                };
              }
              return node;
            })
          );
          
          const response = await toolhouseService.processToolhouseWorkflow(prompt, model);
          
          addLog(`✅ ${bundle.name} execution completed successfully`);
          
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === outputNode.id) {
                return { 
                  ...node, 
                  data: { 
                    ...node.data, 
                    output: response,
                    isProcessing: false
                  } 
                };
              }
              return node;
            })
          );
          
          // Auto-expand right panel and select output node when processing is complete
          if (rightPanelCollapsed) {
            setRightPanelCollapsed(false);
          }
          setSelectedNode(outputNode);
          
          uiToast({
            title: "Bundle Complete",
            description: `Successfully executed ${bundle.name}`,
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          addLog(`❌ Error running ${bundle.name}: ${errorMessage}`);
          
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === outputNode.id) {
                return { 
                  ...node, 
                  data: { 
                    ...node.data, 
                    output: `❌ Error: ${errorMessage}`,
                    isProcessing: false
                  } 
                };
              }
              return node;
            })
          );
          
          uiToast({
            title: "Bundle Error",
            description: errorMessage,
            variant: "destructive"
          });
        }
      }
    } finally {
      setBundles(prev => prev.map(b => 
        b.id === bundleId ? { ...b, isRunning: false } : b
      ));
    }
  };

  const runWorkflow = async () => {
    setIsProcessing(true);
    
    for (const bundle of bundles) {
      await runBundle(bundle.id);
    }
    
    setIsProcessing(false);
  };

  useEffect(() => {
    if (nodes.length === 0) {
      const inputNode = {
        id: `toolhouseInput_${Date.now()}`,
        type: 'customNode',
        position: { x: 200, y: 150 },
        data: { 
          label: 'Input',
          type: 'toolhouseInput',
          config: { 
            prompt: "Generate a Python FizzBuzz program and execute it to show results up to 15.",
            model: "gpt-4o-mini"
          },
          bundleId: null
        },
      };
      
      const outputNode = {
        id: `outputNode_${Date.now()}`,
        type: 'customNode',
        position: { x: 200, y: 350 },
        data: { 
          label: 'Output',
          type: 'outputNode',
          config: {},
          bundleId: null
        },
      };
      
      setNodes([inputNode, outputNode]);
      
      const newEdge = {
        id: `edge-${inputNode.id}-${outputNode.id}`,
        source: inputNode.id,
        target: outputNode.id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#3b82f6', strokeWidth: 2 }
      };
      
      setEdges([newEdge]);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Toolhouse Workflow Builder</h1>
                <p className="text-sm text-slate-600">Visual AI workflow editor</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* API Keys */}
            <div className="flex gap-3">
              <Input
                type="password"
                placeholder="Toolhouse API Key"
                className="w-48 h-9 text-sm"
                value={toolhouseApiKey}
                onChange={(e) => setToolhouseApiKey(e.target.value)}
              />
              <Input
                type="password"
                placeholder="OpenAI API Key"
                className="w-48 h-9 text-sm"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
              />
            </div>
            
            {/* Panel Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)}
              className="h-9"
              title={rightPanelCollapsed ? "Show properties panel" : "Hide properties panel"}
            >
              {rightPanelCollapsed ? (
                <PanelRightOpen className="w-4 h-4" />
              ) : (
                <PanelRightClose className="w-4 h-4" />
              )}
            </Button>
            
            {/* Run Button */}
            <Button 
              onClick={runWorkflow} 
              size="sm" 
              disabled={isProcessing || bundles.length === 0}
              className="h-9 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run All Bundles
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content with Resizable Panels */}
      <div className="flex-1 flex min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Left Sidebar - Bundle Management */}
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <BundlesPanel 
              onDragStart={onDragStart}
              bundles={bundles}
              onRunBundle={runBundle}
              onDeleteBundle={deleteBundle}
              selectedNodes={selectedNodes}
              onCreateBundle={createBundle}
              isSelectionMode={isSelectionMode}
              onToggleSelectionMode={toggleSelectionMode}
              onClearSelection={clearSelection}
            />
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Canvas Area */}
          <ResizablePanel defaultSize={rightPanelCollapsed ? 75 : 50}>
            <div className="h-full flex flex-col">
              <div ref={reactFlowWrapper} className="flex-1">
                <ReactFlow
                  nodes={nodes.map(node => ({
                    ...node,
                    selected: selectedNodes.includes(node.id)
                  }))}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onInit={setReactFlowInstance}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onNodeClick={onNodeClick}
                  onPaneClick={onPaneClick}
                  nodeTypes={nodeTypes}
                  connectionLineType={ConnectionLineType.SmoothStep}
                  fitView
                  className="bg-slate-50"
                  multiSelectionKeyCode={null}
                  selectionOnDrag={false}
                  selectNodesOnDrag={false}
                >
                  <Controls className="bg-white border border-slate-200 rounded-lg shadow-sm" />
                  <Background color="#e2e8f0" gap={16} size={1} />
                  <MiniMap 
                    className="bg-white border border-slate-200 rounded-lg shadow-sm" 
                    nodeColor={(node) => {
                      if (node.data.type === 'toolhouseInput') return '#3b82f6';
                      if (node.data.type === 'outputNode') return '#8b5cf6';
                      return '#64748b';
                    }}
                  />
                  <Panel position="bottom-center" className="bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-2">
                    <div className="text-xs flex items-center gap-3 text-slate-600">
                      <Link className="w-4 h-4" /> 
                      <span>{isSelectionMode ? 'Click nodes to select, then create bundles' : 'Drag components from sidebar to create workflows'}</span>
                      <span className="inline-flex items-center gap-1 text-blue-600">
                        <Zap className="w-3 h-3" />
                        Powered by Toolhouse
                      </span>
                    </div>
                  </Panel>
                </ReactFlow>
              </div>
              
              {/* Debug Panel */}
              <DebugPanel 
                logs={logs} 
                expanded={debugExpanded}
                onToggleExpand={() => setDebugExpanded(!debugExpanded)} 
              />
            </div>
          </ResizablePanel>

          {/* Right Sidebar - Properties */}
          {!rightPanelCollapsed && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <NodePropertiesAdvanced node={selectedNode} onUpdateNode={updateNode} />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

const WorkflowBuilder: React.FC = () => {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner />
    </ReactFlowProvider>
  );
};

export default WorkflowBuilder;