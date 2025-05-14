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
import { Play, Link, Zap, Sparkles, RefreshCw, Group, Square, CheckSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import toolhouseService from '../../services/ToolhouseService';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';

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
  '#e3f2fd', // light blue
  '#f3e5f5', // light purple
  '#e8f5e9', // light green
  '#fff3e0', // light orange
  '#fce4ec', // light pink
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
  
  // Bundle-related state
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [nextBundleId, setNextBundleId] = useState(1);

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
      // Toggle node selection
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

  // Bundle management functions
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

    // Update nodes with bundle ID and style
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

    // Remove bundle styling from nodes
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
          
          // Update output node to show processing state
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
          
          // Get response from Toolhouse service
          const response = await toolhouseService.processToolhouseWorkflow(prompt, model);
          
          addLog(`✅ ${bundle.name} execution completed successfully`);
          
          // Update the output node with the formatted response
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
          
          uiToast({
            title: "Bundle Complete",
            description: `Successfully executed ${bundle.name}`,
          });
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          addLog(`❌ Error running ${bundle.name}: ${errorMessage}`);
          
          // Update output node to show error
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
    
    // Run all bundles sequentially
    for (const bundle of bundles) {
      await runBundle(bundle.id);
    }
    
    setIsProcessing(false);
  };

  // Add some initial nodes to help the user get started
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
      
      // Add an edge connecting them
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Toolhouse Workflow Builder
            </h1>
            <p className="text-sm text-slate-600">Visual AI workflow editor powered by Toolhouse</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="password"
              placeholder="Toolhouse API Key"
              className="px-3 py-2 text-sm border rounded-lg w-48 sm:w-64 bg-white"
              value={toolhouseApiKey}
              onChange={(e) => setToolhouseApiKey(e.target.value)}
            />
            <Input
              type="password"
              placeholder="OpenAI API Key"
              className="px-3 py-2 text-sm border rounded-lg w-48 sm:w-64 bg-white"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
            />
          </div>
          
          {/* Bundle Controls */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={toggleSelectionMode}
              size="sm" 
              variant={isSelectionMode ? "default" : "outline"}
              className="px-3 py-2"
            >
              {isSelectionMode ? <CheckSquare className="h-4 w-4 mr-2" /> : <Square className="h-4 w-4 mr-2" />}
              {isSelectionMode ? "Exit Select" : "Select Nodes"}
            </Button>
            
            {selectedNodes.length > 0 && (
              <>
                <Button 
                  onClick={createBundle}
                  size="sm" 
                  variant="outline"
                  className="px-3 py-2"
                >
                  <Group className="h-4 w-4 mr-2" />
                  Create Bundle ({selectedNodes.length})
                </Button>
                <Button 
                  onClick={clearSelection}
                  size="sm" 
                  variant="ghost"
                  className="px-3 py-2"
                >
                  Clear
                </Button>
              </>
            )}
          </div>
          
          <Button 
            onClick={runWorkflow} 
            size="sm" 
            disabled={isProcessing}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run All Bundles
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Bundle Bar */}
      {bundles.length > 0 && (
        <div className="border-b bg-white/50 backdrop-blur-sm p-2 flex gap-2 overflow-x-auto">
          {bundles.map((bundle) => (
            <div 
              key={bundle.id}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border"
              style={{ backgroundColor: bundle.color, borderColor: bundle.color.replace('f', 'c') }}
            >
              <Group className="h-4 w-4" />
              <span className="text-sm font-medium">{bundle.name}</span>
              <span className="text-xs text-gray-600">({bundle.nodeIds.length} nodes)</span>
              <Button
                onClick={() => runBundle(bundle.id)}
                disabled={bundle.isRunning}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
              >
                {bundle.isRunning ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3" />
                )}
              </Button>
              <Button
                onClick={() => deleteBundle(bundle.id)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex-1 flex">
        {/* Left Sidebar - Node Panel */}
        <div className="w-64 border-r bg-white/50 backdrop-blur-sm p-3">
          <NodePanel onDragStart={onDragStart} />
        </div>

        {/* Main Canvas */}
        <div className="flex-1 flex flex-col">
          <div ref={reactFlowWrapper} className="flex-1 relative">
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
              <Controls className="bg-white border shadow-sm" />
              <Background color="#e2e8f0" gap={20} />
              <MiniMap className="bg-white border shadow-sm" />
              <Panel position="bottom-center" className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-sm border">
                <div className="text-xs flex items-center gap-2 text-slate-600">
                  <Link className="h-4 w-4" /> 
                  <span>{isSelectionMode ? 'Click nodes to select, then create bundles' : 'Connect nodes and create bundles to build workflows'}</span>
                  <span className="inline-flex items-center gap-1">
                    <Zap className="h-3 w-3" />
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

        {/* Right Sidebar - Properties Panel */}
        <div className="w-64 border-l bg-white/50 backdrop-blur-sm p-3">
          <NodeProperties node={selectedNode} onUpdateNode={updateNode} />
        </div>
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