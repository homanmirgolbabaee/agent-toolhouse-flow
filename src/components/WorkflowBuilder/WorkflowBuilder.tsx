
import React, { useState, useCallback, useRef } from 'react';
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
import { Play } from 'lucide-react';
import toolhouseService from '../../services/ToolhouseService';

const nodeTypes = {
  customNode: CustomNode,
};

const WorkflowBuilder: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [apiKey, setApiKey] = useState<string>('');

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
        const position = reactFlowInstance.project({
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
            config: {}
          },
        };

        setNodes((nds) => nds.concat(newNode));
      }
    },
    [reactFlowInstance, setNodes]
  );

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const getNodeLabel = (type: string): string => {
    switch (type) {
      case 'toolhouseInput':
        return 'User Input';
      case 'toolhouseTool':
        return 'Toolhouse Tool';
      case 'llmNode':
        return 'LLM';
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
            return { ...node, data: { ...data } };
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

  const initializeToolhouse = async () => {
    // In a real app, you'd want to store this securely
    if (!apiKey) {
      addLog('Please enter a Toolhouse API key');
      return;
    }
    
    addLog('Initializing Toolhouse...');
    const success = await toolhouseService.initialize(apiKey, { id: 'workflow-builder' });
    
    if (success) {
      addLog('Toolhouse initialized successfully');
      const tools = await toolhouseService.getTools();
      addLog(`Retrieved ${tools.length} tools`);
    } else {
      addLog('Failed to initialize Toolhouse');
    }
  };

  const runWorkflow = async () => {
    if (!toolhouseService.isInitialized()) {
      await initializeToolhouse();
      if (!toolhouseService.isInitialized()) {
        return;
      }
    }
    
    addLog('Running workflow...');
    
    // Example code to show a potential flow - in a real app, this would parse the graph
    // and execute nodes in dependency order
    addLog('Analyzing workflow...');
    
    // Mock execution - in a real implementation, this would actually execute the workflow
    // based on the node graph
    addLog('This is a demo - actual execution not implemented');
    addLog('Workflow execution completed');
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="border-b p-2 flex justify-between items-center bg-background">
        <h1 className="text-xl font-bold">Toolhouse Workflow Builder</h1>
        <div className="flex items-center gap-2">
          <input
            type="password"
            placeholder="Toolhouse API Key"
            className="px-3 py-1 text-sm border rounded"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
          />
          <Button onClick={runWorkflow} size="sm">
            <Play className="h-4 w-4 mr-2" /> Run Workflow
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
            </ReactFlow>
          </div>
          <div className="h-48 border-t">
            <DebugPanel logs={logs} />
          </div>
        </div>
        <div className="w-64 border-l bg-muted/30 p-2">
          <NodeProperties node={selectedNode} onUpdateNode={updateNode} />
        </div>
      </div>
    </div>
  );
};

export default WorkflowBuilder;
