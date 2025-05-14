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
import YamlFileUpload from './YamlFileUpload';
import { Button } from '@/components/ui/button';
import { Play, Sparkles, RefreshCw, PanelRightOpen, PanelRightClose, Zap, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import toolhouseService from '../../services/ToolhouseService';
import yamlService, { ParsedAgent } from '../../services/ToolhouseYamlService';
import { useToast } from '@/hooks/use-toast';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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

const BUNDLE_COLOR_PALETTE = [
  { name: 'Blue', color: '#2196f3', light: '#e3f2fd' },
  { name: 'Purple', color: '#9c27b0', light: '#f3e5f5' },
  { name: 'Green', color: '#4caf50', light: '#e8f5e9' },
  { name: 'Orange', color: '#ff9800', light: '#fff3e0' },
  { name: 'Pink', color: '#e91e63', light: '#fce4ec' },
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
  const [isYamlDialogOpen, setIsYamlDialogOpen] = useState(false);

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
    
    // Check for Ctrl+Click for multi-selection
    if (event.ctrlKey || event.metaKey) {
      setSelectedNodes(prev => 
        prev.includes(node.id) 
          ? prev.filter(id => id !== node.id)
          : [...prev, node.id]
      );
      return;
    }
    
    if (isSelectionMode) {
      setSelectedNodes(prev => 
        prev.includes(node.id) 
          ? prev.filter(id => id !== node.id)
          : [...prev, node.id]
      );
    } else {
      // Clear multi-selection when clicking without Ctrl
      setSelectedNodes([]);
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
      case 'yamlAgentNode':
        return {
          agentConfig: null,
          variables: {},
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
        return 'AI Input';
      case 'outputNode':
        return 'Output';
      case 'yamlAgentNode':
        return 'YAML Agent';
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

  // Handle YAML file upload
  const handleYamlParsed = useCallback((parsedAgent: ParsedAgent) => {
    const { config, variables } = parsedAgent;
    
    // Create a new YAML agent node
    const position = { x: 200, y: 150 };
    
    const yamlAgentNode = {
      id: `yamlAgent_${Date.now()}`,
      type: 'customNode',
      position,
      data: {
        label: config.title || 'YAML Agent',
        type: 'yamlAgentNode',
        config: {
          agentConfig: config,
          variables: variables.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {}),
          model: 'gpt-4o-mini'
        },
        bundleId: null,
        onDelete: handleNodeDelete
      },
    };

    // Create an output node for the YAML agent
    const outputNode = {
      id: `output_${Date.now()}`,
      type: 'customNode',
      position: { x: position.x, y: position.y + 200 },
      data: {
        label: 'Output',
        type: 'outputNode',
        config: {},
        bundleId: null,
        onDelete: handleNodeDelete
      },
    };

    // Create an edge connecting them
    const edge = {
      id: `edge-${yamlAgentNode.id}-${outputNode.id}`,
      source: yamlAgentNode.id,
      target: outputNode.id,
      type: 'smoothstep',
      animated: true,
      style: { 
        stroke: 'url(#edgeGradient)', 
        strokeWidth: 3,
        transition: 'all 0.3s ease-in-out'
      }
    };

    setNodes((nds) => [...nds, yamlAgentNode, outputNode]);
    setEdges((eds) => [...eds, edge]);
    setIsYamlDialogOpen(false);

    addLog(`✅ YAML agent "${config.title}" loaded successfully`);
    uiToast({
      title: "YAML Agent Loaded",
      description: `Agent "${config.title}" has been added to the workflow`,
    });
  }, [setNodes, setEdges, handleNodeDelete, addLog, uiToast]);

  const handleYamlError = useCallback((error: string) => {
    addLog(`❌ YAML upload error: ${error}`);
    uiToast({
      title: "YAML Upload Error",
      description: error,
      variant: "destructive"
    });
  }, [addLog, uiToast]);

  const createBundle = (selectedColor?: { name: string; color: string; light: string }) => {
    if (selectedNodes.length === 0) {
      uiToast({
        title: "No Nodes Selected",
        description: "Please select nodes to create a bundle",
        variant: "destructive"
      });
      return;
    }

    // Check if selected nodes form a valid workflow
    const agentNodes = selectedNodes.filter(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      return node?.data.type === 'toolhouseInput' || node?.data.type === 'yamlAgentNode';
    });

    const outputNodes = selectedNodes.filter(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      return node?.data.type === 'outputNode';
    });

    if (agentNodes.length === 0 || outputNodes.length === 0) {
      uiToast({
        title: "Invalid Bundle",
        description: "A bundle must contain at least one agent (Input/YAML) and one output node",
        variant: "destructive"
      });
      return;
    }

    const bundleId = `bundle_${nextBundleId}`;
    const color = selectedColor || BUNDLE_COLOR_PALETTE[(nextBundleId - 1) % BUNDLE_COLOR_PALETTE.length];
    
    const newBundle: Bundle = {
      id: bundleId,
      name: `Bundle ${nextBundleId}`,
      nodeIds: [...selectedNodes],
      color: color.color,
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
            backgroundColor: color.light,
            border: `2px solid ${color.color}`,
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

  const changeBundleColor = (bundleId: string, newColor: { name: string; color: string; light: string }) => {
    setBundles(prev => prev.map(bundle => 
      bundle.id === bundleId ? { ...bundle, color: newColor.color } : bundle
    ));

    // Update node styles
    setNodes(nds => nds.map(node => {
      if (node.data.bundleId === bundleId) {
        return {
          ...node,
          style: { 
            ...node.style, 
            backgroundColor: newColor.light,
            border: `2px solid ${newColor.color}`,
            transition: 'all 0.3s ease-in-out',
          }
        };
      }
      return node;
    }));
  };

  const findNodesByType = (nodeIds: string[], types: string[]) => {
    return nodes.filter(node => nodeIds.includes(node.id) && types.includes(node.data.type));
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

  // Update bundle running state
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

    // Apply animation effect only to bundle edges
    const bundle = bundles.find(b => b.id === bundleId);
    if (bundle) {
      setEdges(eds => eds.map(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);
        
        // Only animate edges that connect nodes within the same bundle
        if (sourceNode?.data.bundleId === bundleId && targetNode?.data.bundleId === bundleId) {
          return {
            ...edge,
            className: isRunning ? 'bundle-running' : '',
            style: {
              ...edge.style,
              stroke: isRunning ? 'url(#bundleRunningGradient)' : 'url(#edgeGradient)',
              strokeWidth: isRunning ? 4 : 3,
              transition: 'all 0.3s ease-in-out',
              filter: isRunning ? 'drop-shadow(0 0 8px currentColor)' : 'none',
            },
            animated: isRunning,
            data: {
              ...edge.data,
              isRunning,
            }
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
      
      // Find agent nodes (both toolhouseInput and yamlAgentNode)
      const agentNodes = findNodesByType(bundle.nodeIds, ['toolhouseInput', 'yamlAgentNode']);
      const outputNodes = findNodesByType(bundle.nodeIds, ['outputNode']);
      
      if (agentNodes.length === 0) {
        addLog(`❌ Error: No agent node found in ${bundle.name}`);
        uiToast({
          title: "Missing Agent",
          description: `No agent node found in ${bundle.name}`,
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
      
      for (const agentNode of agentNodes) {
        const connectedOutputs = getConnectedNodes(agentNode.id, 'source');
        const outputNode = connectedOutputs.find(node => 
          node.data.type === 'outputNode' && bundle.nodeIds.includes(node.id)
        );
        
        if (!outputNode) {
          addLog(`❌ Error: Agent node in ${bundle.name} is not connected to an output node`);
          continue;
        }
        
        try {
          let response: string;
          const model = agentNode.data.config.model || 'gpt-4o-mini';
          
          // Set processing state for output node
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === outputNode.id) {
                return { 
                  ...node, 
                  data: { 
                    ...node.data, 
                    output: "",
                    isProcessing: true
                  }
                };
              }
              return node;
            })
          );
          
          // Handle different agent types
          if (agentNode.data.type === 'yamlAgentNode') {
            // Handle YAML agent
            const { agentConfig, variables } = agentNode.data.config;
            if (!agentConfig) {
              throw new Error('No agent configuration found in YAML node');
            }
            
            addLog(`🤖 Running YAML agent: ${agentConfig.title}`);
            response = await toolhouseService.runToolhouseAgent(agentConfig, variables, model);
          } else {
            // Handle regular toolhouse input
            const prompt = agentNode.data.config.prompt;
            addLog(`⚡ Processing input in ${bundle.name}: "${prompt.substring(0, 50)}..."`);
            response = await toolhouseService.processToolhouseWorkflow(prompt, model);
          }
          
          addLog(`✅ ${bundle.name} execution completed successfully`);
          
          // Set success state (remove processing state)
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
          label: 'AI Input',
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
          stroke: 'url(#edgeGradient)', 
          strokeWidth: 3,
          transition: 'all 0.3s ease-in-out'
        }
      };
      
      setEdges([newEdge]);
    }
  }, [nodes.length, handleNodeDelete, setNodes, setEdges]);

  // Add keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // ESC to exit selection mode and clear selections
      if (event.key === 'Escape') {
        if (isSelectionMode) {
          setIsSelectionMode(false);
        }
        setSelectedNodes([]);
        setSelectedNode(null);
      }
      
      // Delete selected nodes (either multi-selection or single selection)
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        
        // Delete multi-selected nodes
        if (selectedNodes.length > 0) {
          selectedNodes.forEach(nodeId => handleNodeDelete(nodeId));
          setSelectedNodes([]);
        }
        // Delete single selected node
        else if (selectedNode) {
          handleNodeDelete(selectedNode.id);
          setSelectedNode(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isSelectionMode, selectedNodes, selectedNode, handleNodeDelete]);

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Enhanced Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Workflow Studio</h1>
                <p className="text-sm text-slate-600">Build intelligent AI workflows</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* YAML Upload Button */}
            <Dialog open={isYamlDialogOpen} onOpenChange={setIsYamlDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload YAML
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Upload Toolhouse Agent YAML</DialogTitle>
                </DialogHeader>
                <YamlFileUpload 
                  onYamlParsed={handleYamlParsed}
                  onError={handleYamlError}
                />
              </DialogContent>
            </Dialog>
            
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
              colorPalette={BUNDLE_COLOR_PALETTE}
              onChangeBundleColor={changeBundleColor}
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
                    selected: selectedNodes.includes(node.id) || selectedNode?.id === node.id,
                    data: {
                      ...node.data,
                      isMultiSelected: selectedNodes.includes(node.id),
                      isSingleSelected: selectedNode?.id === node.id,
                    }
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
                  multiSelectionKeyCode={['Meta', 'Ctrl']}
                  selectionOnDrag={false}
                  selectNodesOnDrag={false}
                  connectionLineStyle={{
                    stroke: '#6366f1',
                    strokeWidth: 3,
                    strokeDasharray: 'none',
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                  }}
                  defaultEdgeOptions={{
                    type: 'smoothstep',
                    animated: false,
                    style: { 
                      stroke: 'url(#edgeGradient)', 
                      strokeWidth: 3,
                      strokeLinecap: 'round',
                      strokeLinejoin: 'round',
                      transition: 'all 0.3s ease-in-out'
                    }
                  }}
                >
                  <Controls className="bg-white border border-slate-200 rounded-lg shadow-sm" />
                  <Background color="#e2e8f0" gap={20} size={1} variant="dots" />
                  <MiniMap 
                    className="bg-white border border-slate-200 rounded-lg shadow-sm" 
                    nodeColor={(node) => {
                      if (node.data.type === 'toolhouseInput') return '#6366f1';
                      if (node.data.type === 'outputNode') return '#8b5cf6';
                      if (node.data.type === 'yamlAgentNode') return '#10b981';
                      return '#64748b';
                    }}
                    maskColor="rgba(0, 0, 0, 0.1)"
                  />
                  
                  {/* SVG Definitions for Gradients */}
                  <svg style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0 }}>
                    <defs>
                      <linearGradient id="edgeGradient" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#4f46e5" />
                        <stop offset="100%" stopColor="#7c3aed" />
                      </linearGradient>
                      
                      <linearGradient id="selectedEdgeGradient" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                      
                      <linearGradient id="connectionGradient" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="50%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                      
                      <linearGradient id="bundleRunningGradient" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                        <stop offset="25%" stopColor="#3b82f6" stopOpacity="1" />
                        <stop offset="75%" stopColor="#6366f1" stopOpacity="1" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.9" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  <Panel position="bottom-center" className="bg-white rounded-lg shadow-sm border border-slate-200 px-4 py-2">
                    <div className="text-xs text-slate-600 flex items-center gap-4">
                      <span>
                        {isSelectionMode ? 'Click nodes to select, then create bundles' : 'Drag components from sidebar or upload YAML files'}
                      </span>
                      {(selectedNodes.length > 0 || selectedNode) && (
                        <span className="text-blue-600 font-medium">
                          {selectedNodes.length > 0 
                            ? `${selectedNodes.length} nodes selected` 
                            : '1 node selected'} 
                          - Press DEL to delete
                        </span>
                      )}
                      <span className="text-slate-400">•</span>
                      <span>Ctrl+Click for multi-select</span>
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