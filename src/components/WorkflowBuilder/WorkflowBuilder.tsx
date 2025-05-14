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
  ReactFlowProvider,
  EdgeChange,
  NodeChange
} from 'reactflow';
import 'reactflow/dist/style.css';

import CustomNode from './Node';
import NodePanel from './NodePanel';
import NodeProperties from './NodeProperties';
import DebugPanel from './DebugPanel';
import { Button } from '@/components/ui/button';
import { Play, Sparkles, RefreshCw, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { Input } from '@/components/ui/input';
import toolhouseService from '../../services/ToolhouseService';
import { useToast } from '@/hooks/use-toast';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';

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
  const [runningBundles, setRunningBundles] = useState<Set<string>>(new Set());

  // Custom node change handler to maintain bundle relationships
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Handle node deletions by cleaning up bundles
    changes.forEach(change => {
      if (change.type === 'remove') {
        const nodeId = change.id;
        
        // Remove node from all bundles and clean up empty bundles
        setBundles(prev => prev.map(bundle => ({
          ...bundle,
          nodeIds: bundle.nodeIds.filter(id => id !== nodeId)
        })).filter(bundle => bundle.nodeIds.length > 0));
        
        // Clear selection if deleted node was selected
        if (selectedNode?.id === nodeId) {
          setSelectedNode(null);
        }
        
        // Remove from selected nodes
        setSelectedNodes(prev => prev.filter(id => id !== nodeId));
      }
    });
    
    onNodesChange(changes);
  }, [onNodesChange, selectedNode, setBundles, setSelectedNode, setSelectedNodes]);

  // Custom edge change handler with smooth animations
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes);
  }, [onEdgesChange]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        id: `edge-${params.source}-${params.target}`,
        type: 'smoothstep',
        animated: true,
        style: { 
          stroke: '#3b82f6', 
          strokeWidth: 2,
          transition: 'all 0.3s ease-in-out'
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    
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
            bundleId: null,
            onDelete: handleNodeDelete
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

  const handleNodeDelete = useCallback((nodeId: string) => {
    // Remove the node with smooth animation
    setNodes((nds) => nds.map(node => 
      node.id === nodeId 
        ? { ...node, style: { ...node.style, opacity: 0, transform: 'scale(0.8)' } }
        : node
    ));
    
    // After animation, actually remove the node
    setTimeout(() => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    }, 300);

    uiToast({
      title: "Node Deleted",
      description: "Node and its connections have been removed.",
    });
  }, [setNodes, setEdges, uiToast]);

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

    // Check if selected nodes form a valid workflow
    const inputNodes = selectedNodes.filter(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      return node?.data.type === 'toolhouseInput';
    });

    const outputNodes = selectedNodes.filter(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      return node?.data.type === 'outputNode';
    });

    if (inputNodes.length === 0 || outputNodes.length === 0) {
      uiToast({
        title: "Invalid Bundle",
        description: "A bundle must contain at least one input and one output node",
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

    // Update nodes with bundle styling
    setNodes(nds => nds.map(node => {
      if (selectedNodes.includes(node.id)) {
        return {
          ...node,
          data: { ...node.data, bundleId },
          style: { 
            ...node.style, 
            backgroundColor: newBundle.color,
            border: `2px solid ${newBundle.color.replace('f', 'c')}`,
            transition: 'all 0.3s ease-in-out',
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

    // Remove bundle styling from nodes with smooth transition
    setNodes(nds => nds.map(node => {
      if (bundle.nodeIds.includes(node.id)) {
        const { bundleId, ...data } = node.data;
        return {
          ...node,
          data,
          style: { 
            ...node.style, 
            backgroundColor: undefined, 
            border: '2px solid #e2e8f0',
            transition: 'all 0.3s ease-in-out',
          }
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

  const renameBundle = (bundleId: string, newName: string) => {
    setBundles(prev => prev.map(bundle => 
      bundle.id === bundleId ? { ...bundle, name: newName } : bundle
    ));
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

  // Update bundle running state and apply glow effect
  const updateBundleRunningState = useCallback((bundleId: string, isRunning: boolean) => {
    setBundles(prev => prev.map(b => 
      b.id === bundleId ? { ...b, isRunning } : b
    ));
    
    setRunningBundles(prev => {
      const newSet = new Set(prev);
      if (isRunning) {
        newSet.add(bundleId);
      } else {
        newSet.delete(bundleId);
      }
      return newSet;
    });

    // Apply glow effect to bundle edges
    const bundle = bundles.find(b => b.id === bundleId);
    if (bundle) {
      setEdges(eds => eds.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        if (sourceNode?.data.bundleId === bundleId && targetNode?.data.bundleId === bundleId) {
          return {
            ...edge,
            style: {
              ...edge.style,
              stroke: isRunning ? '#3b82f6' : '#3b82f6',
              strokeWidth: isRunning ? 4 : 2,
              transition: 'all 0.3s ease-in-out',
              filter: isRunning ? 'drop-shadow(0 0 8px #3b82f6)' : 'none',
            },
            animated: isRunning,
          };
        }
        return edge;
      }));
    }
  }, [setBundles, setRunningBundles, setEdges, bundles, nodes]);

  const runBundle = async (bundleId: string) => {
    const bundle = bundles.find(b => b.id === bundleId);
    if (!bundle) {
      addLog(`❌ Error: Bundle ${bundleId} not found`);
      return;
    }

    updateBundleRunningState(bundleId, true);
    setDebugExpanded(true);

    try {
      if (!toolhouseService.isInitialized()) {
        const initialized = await initializeToolhouse();
        if (!initialized) {
          updateBundleRunningState(bundleId, false);
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
        updateBundleRunningState(bundleId, false);
        return;
      }
      
      if (outputNodes.length === 0) {
        addLog(`❌ Error: No output node found in ${bundle.name}`);
        uiToast({
          title: "Missing Output",
          description: `No output node found in ${bundle.name}`,
          variant: "destructive"
        });
        updateBundleRunningState(bundleId, false);
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
          
          // Set processing state with glow effect
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === outputNode.id) {
                return { 
                  ...node, 
                  data: { 
                    ...node.data, 
                    output: "",
                    isProcessing: true
                  },
                  style: {
                    ...node.style,
                    filter: 'drop-shadow(0 0 12px #3b82f6)',
                    transition: 'all 0.3s ease-in-out'
                  }
                };
              }
              return node;
            })
          );
          
          const response = await toolhouseService.processToolhouseWorkflow(prompt, model);
          
          addLog(`✅ ${bundle.name} execution completed successfully`);
          
          // Set success state
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === outputNode.id) {
                return { 
                  ...node, 
                  data: { 
                    ...node.data, 
                    output: response,
                    isProcessing: false
                  },
                  style: {
                    ...node.style,
                    filter: 'none',
                    transition: 'all 0.3s ease-in-out'
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
                  },
                  style: {
                    ...node.style,
                    filter: 'none',
                    transition: 'all 0.3s ease-in-out'
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
      updateBundleRunningState(bundleId, false);
    }
  };

  const runWorkflow = async () => {
    setIsProcessing(true);
    
    for (const bundle of bundles) {
      await runBundle(bundle.id);
    }
    
    setIsProcessing(false);
  };

  // Initialize with default nodes
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
          bundleId: null,
          onDelete: handleNodeDelete
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
          bundleId: null,
          onDelete: handleNodeDelete
        },
      };
      
      setNodes([inputNode, outputNode]);
      
      const newEdge = {
        id: `edge-${inputNode.id}-${outputNode.id}`,
        source: inputNode.id,
        target: outputNode.id,
        type: 'smoothstep',
        animated: true,
        style: { 
          stroke: '#3b82f6', 
          strokeWidth: 2,
          transition: 'all 0.3s ease-in-out'
        }
      };
      
      setEdges([newEdge]);
    }
  }, [nodes.length, handleNodeDelete, setNodes, setEdges]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // ESC to exit selection mode
      if (event.key === 'Escape' && isSelectionMode) {
        setIsSelectionMode(false);
        setSelectedNodes([]);
      }
      
      // Delete selected nodes
      if (event.key === 'Delete' && selectedNodes.length > 0) {
        selectedNodes.forEach(nodeId => handleNodeDelete(nodeId));
        setSelectedNodes([]);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isSelectionMode, selectedNodes, handleNodeDelete]);

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
            <NodePanel 
              onDragStart={onDragStart}
              bundles={bundles}
              onRunBundle={runBundle}
              onDeleteBundle={deleteBundle}
              onRenameBundle={renameBundle}
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
                  onNodesChange={handleNodesChange}
                  onEdgesChange={handleEdgesChange}
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
                  connectionLineStyle={{
                    stroke: '#3b82f6',
                    strokeWidth: 2,
                    strokeDasharray: '5,5',
                  }}
                  defaultEdgeOptions={{
                    type: 'smoothstep',
                    animated: false,
                    style: { 
                      stroke: '#3b82f6', 
                      strokeWidth: 2,
                      transition: 'all 0.3s ease-in-out'
                    }
                  }}
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
                    <div className="text-xs text-slate-600">
                      {isSelectionMode ? 'Click nodes to select, then create bundles' : 'Drag components from sidebar to create workflows'}
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
                <NodeProperties node={selectedNode} onUpdateNode={updateNode} />
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