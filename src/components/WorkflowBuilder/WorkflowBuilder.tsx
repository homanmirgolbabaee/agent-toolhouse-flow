
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
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';

import CustomNode from './Node';
import NodePanel from './NodePanel';
import NodeProperties from './NodeProperties';
import DebugPanel from './DebugPanel';
import { Button } from '@/components/ui/button';
import { Play, Link } from 'lucide-react';
import { Input } from '@/components/ui/input';
import toolhouseService from '../../services/ToolhouseService';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';

const nodeTypes = {
  customNode: CustomNode,
};

const WorkflowBuilder: React.FC = () => {
  const { toast: uiToast } = useToast();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [toolhouseApiKey, setToolhouseApiKey] = useState<string>('');
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [debugExpanded, setDebugExpanded] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      type: 'smoothstep',
      animated: true
    }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      // Check if the dropped element is valid
      if (typeof type === 'undefined' || !type) {
        return;
      }

      if (reactFlowInstance && reactFlowBounds) {
        const position = reactFlowInstance.screenToFlowPosition({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        // Create a new node
        const newNode = {
          id: `${type}_${Date.now()}`,
          type: 'customNode',
          position,
          data: { 
            label: getNodeLabel(type),
            type: type,
            config: getDefaultConfig(type)
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
        return { prompt: "Get the contents of https://toolhouse.ai and summarize them in a few bullet points.", model: "gpt-4o-mini" };
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
      console.log("Updating node:", nodeId, data);
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

  // Find nodes by type
  const findNodesByType = (type: string) => {
    return nodes.filter(node => node.data.type === type);
  };

  // Get connected nodes
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
    // Validate API keys
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
    
    addLog('Initializing Toolhouse and OpenAI...');
    const success = await toolhouseService.initialize(toolhouseApiKey, openaiApiKey, { id: 'workflow-builder' });
    
    if (success) {
      addLog('Toolhouse and OpenAI initialized successfully');
      const tools = await toolhouseService.getTools();
      addLog(`Retrieved ${tools.length} tools`);
      return true;
    } else {
      addLog('Failed to initialize Toolhouse or OpenAI');
      uiToast({
        title: "Initialization Failed",
        description: "Failed to initialize API clients. Check your API keys and try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const runWorkflow = async () => {
    setDebugExpanded(true);
    setIsProcessing(true);
    
    try {
      if (!toolhouseService.isInitialized()) {
        const initialized = await initializeToolhouse();
        if (!initialized) {
          setIsProcessing(false);
          return;
        }
      }
      
      addLog('Running workflow...');
      
      // Find input and output nodes
      const inputNodes = findNodesByType('toolhouseInput');
      const outputNodes = findNodesByType('outputNode');
      
      if (inputNodes.length === 0) {
        addLog('Error: No input node found in the workflow');
        uiToast({
          title: "Missing Input",
          description: "No input node found in the workflow",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      if (outputNodes.length === 0) {
        addLog('Error: No output node found in the workflow');
        uiToast({
          title: "Missing Output",
          description: "No output node found in the workflow",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
      
      // Check if input and output are connected
      for (const inputNode of inputNodes) {
        const connectedOutputs = getConnectedNodes(inputNode.id, 'source');
        const outputNode = connectedOutputs.find(node => node.data.type === 'outputNode');
        
        if (!outputNode) {
          addLog(`Error: Input node "${inputNode.data.label}" is not connected to an output node`);
          uiToast({
            title: "Connection Error",
            description: "Input node is not connected to an output node",
            variant: "destructive"
          });
          continue;
        }
        
        // Process this input-output pair
        try {
          // Get the latest prompt and model from the input node
          const prompt = inputNode.data.config.prompt;
          const model = inputNode.data.config.model || 'gpt-4o-mini';
          
          addLog(`Processing input: "${prompt.substring(0, 30)}..."`);
          
          // Update output node to show processing state
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === outputNode.id) {
                return { 
                  ...node, 
                  data: { 
                    ...node.data, 
                    output: "Processing...",
                    isProcessing: true
                  } 
                };
              }
              return node;
            })
          );
          
          // Get actual response from the toolhouse service using the current prompt value
          const response = await toolhouseService.processToolhouseWorkflow(prompt, model);
          
          addLog(`Workflow execution completed successfully`);
          
          // Update the output node with the response
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
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          addLog(`Error running workflow: ${errorMessage}`);
          
          // Update output node to show error
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === outputNode.id) {
                return { 
                  ...node, 
                  data: { 
                    ...node.data, 
                    output: `Error: ${errorMessage}`,
                    isProcessing: false
                  } 
                };
              }
              return node;
            })
          );
          
          uiToast({
            title: "Workflow Error",
            description: errorMessage,
            variant: "destructive"
          });
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Add some initial nodes to help the user get started
  useEffect(() => {
    if (nodes.length === 0) {
      const inputNode = {
        id: `toolhouseInput_${Date.now()}`,
        type: 'customNode',
        position: { x: 250, y: 150 },
        data: { 
          label: 'Input',
          type: 'toolhouseInput',
          config: { 
            prompt: "Get the contents of https://toolhouse.ai and summarize them in a few bullet points.",
            model: "gpt-4o-mini"
          }
        },
      };
      
      const outputNode = {
        id: `outputNode_${Date.now()}`,
        type: 'customNode',
        position: { x: 250, y: 300 },
        data: { 
          label: 'Output',
          type: 'outputNode',
          config: {}
        },
      };
      
      setNodes([inputNode, outputNode]);
      
      // Add an edge connecting them
      const newEdge = {
        id: `edge-${inputNode.id}-${outputNode.id}`,
        source: inputNode.id,
        target: outputNode.id,
        type: 'smoothstep',
        animated: true
      };
      
      setEdges([newEdge]);
    }
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b p-2 flex justify-between items-center bg-background">
        <h1 className="text-xl font-bold">Toolhouse Workflow Builder</h1>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="password"
              placeholder="Toolhouse API Key"
              className="px-3 py-1 text-sm border rounded w-48 sm:w-64"
              value={toolhouseApiKey}
              onChange={(e) => setToolhouseApiKey(e.target.value)}
            />
            <Input
              type="password"
              placeholder="OpenAI API Key"
              className="px-3 py-1 text-sm border rounded w-48 sm:w-64"
              value={openaiApiKey}
              onChange={(e) => setOpenaiApiKey(e.target.value)}
            />
          </div>
          <Button onClick={runWorkflow} size="sm" disabled={isProcessing}>
            <Play className="h-4 w-4 mr-2" /> {isProcessing ? 'Processing...' : 'Run Workflow'}
          </Button>
        </div>
      </div>
      <div className="flex-1 flex">
        <div className="w-64 border-r bg-muted/30 p-2">
          <NodePanel onDragStart={onDragStart} />
        </div>
        <div className="flex-1 flex flex-col">
          <div ref={reactFlowWrapper} className="flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onInit={setReactFlowInstance}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onNodeClick={onNodeClick}
              nodeTypes={nodeTypes}
              connectionLineType={ConnectionLineType.SmoothStep}
              fitView
            >
              <Controls />
              <Background />
              <MiniMap />
              <Panel position="bottom-center" className="bg-background/80 p-2 rounded shadow">
                <div className="text-xs flex items-center gap-2">
                  <Link className="h-4 w-4" /> 
                  Connect input to output to create a workflow
                </div>
              </Panel>
            </ReactFlow>
          </div>
          <DebugPanel 
            logs={logs} 
            expanded={debugExpanded}
            onToggleExpand={() => setDebugExpanded(!debugExpanded)} 
          />
        </div>
        <div className="w-64 border-l bg-muted/30 p-2">
          <NodeProperties node={selectedNode} onUpdateNode={updateNode} />
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;
