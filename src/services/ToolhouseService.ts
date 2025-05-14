import { Toolhouse } from "@toolhouseai/sdk";
import OpenAI from "openai";
import yamlService, { ToolhouseAgentConfig } from "./ToolhouseYamlService";

class ToolhouseService {
  private toolhouse: Toolhouse | null = null;
  private openai: OpenAI | null = null;
  private initialized = false;
  private tools: any[] = [];

  async initialize(toolhouseApiKey: string, openaiApiKey: string, metadata = {}) {
    try {
      console.log('🔧 Initializing Toolhouse service with TypeScript SDK');
      
      // Initialize Toolhouse with TypeScript SDK
      this.toolhouse = new Toolhouse({
        apiKey: toolhouseApiKey,
        metadata: {
          id: 'workflow-builder',
          timezone: '0',
          ...metadata
        }
      });

      // Initialize OpenAI client with browser support
      this.openai = new OpenAI({
        apiKey: openaiApiKey,
        dangerouslyAllowBrowser: true
      });

      this.initialized = true;
      console.log('✅ Toolhouse and OpenAI services initialized successfully');
      
      // Get available tools using TypeScript SDK
      this.tools = await this.toolhouse.getTools();
      console.log(`🛠️ Retrieved ${this.tools.length} tools from Toolhouse`);
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Toolhouse:', error);
      this.initialized = false;
      return false;
    }
  }

  isInitialized(): boolean {
    return this.initialized && this.toolhouse !== null && this.openai !== null;
  }

  async getTools(): Promise<any[]> {
    if (!this.isInitialized()) {
      console.warn('⚠️ Toolhouse not initialized');
      return [];
    }
    
    try {
      if (this.tools.length === 0 && this.toolhouse) {
        this.tools = await this.toolhouse.getTools();
        console.log(`🔄 Refreshed tools list: ${this.tools.length} tools available`);
      }
      return this.tools;
    } catch (error) {
      console.error('❌ Failed to get tools:', error);
      return [];
    }
  }

  // Enhanced method to run Toolhouse agents from YAML configuration
  async runToolhouseAgent(
    agentConfig: ToolhouseAgentConfig, 
    variableValues: Record<string, any> = {},
    model: string = "gpt-4o-mini"
  ): Promise<string> {
    if (!this.isInitialized() || !this.openai || !this.toolhouse) {
      const error = 'Services not properly initialized. Please check your API keys.';
      console.warn('⚠️', error);
      return this.formatErrorResponse('Initialization Error', error);
    }

    try {
      console.log(`🤖 Running Toolhouse agent: "${agentConfig.title}"`);
      console.log(`📋 Agent ID: ${agentConfig.id}`);
      
      // Validate agent configuration
      const validation = yamlService.validateAgent(agentConfig);
      if (!validation.valid) {
        const error = `Invalid agent configuration: ${validation.errors.join(', ')}`;
        console.error('❌', error);
        return this.formatErrorResponse('Configuration Error', error);
      }
      
      // Merge default vars with provided values, ensuring all variables are provided
      const mergedVars = { ...agentConfig.vars, ...variableValues };
      console.log(`🔧 Variables: ${Object.keys(mergedVars).join(', ')}`);
      
      // Validate that all required variables are provided
      const requiredVars = yamlService.extractVariablesFromPrompt(agentConfig.prompt);
      const missingVars = requiredVars.filter(varName => !(varName in mergedVars));
      
      if (missingVars.length > 0) {
        const error = `Missing required variables: ${missingVars.join(', ')}`;
        console.error('❌', error);
        return this.formatErrorResponse('Variable Error', error);
      }
      
      // Generate the final prompt with variables
      const finalPrompt = yamlService.generatePromptWithVariables(agentConfig.prompt, mergedVars);
      console.log(`📝 Generated prompt: "${finalPrompt.substring(0, 100)}..."`);
      
      // Add bundle context if specified
      let contextualPrompt = finalPrompt;
      if (agentConfig.bundle && agentConfig.bundle !== 'default') {
        contextualPrompt = `[Bundle: ${agentConfig.bundle}]\n\n${finalPrompt}`;
      }
      
      // Add toolhouse_id context if specified
      if (agentConfig.toolhouse_id && agentConfig.toolhouse_id !== 'default') {
        contextualPrompt = `[Toolhouse ID: ${agentConfig.toolhouse_id}]\n\n${contextualPrompt}`;
      }
      
      // Create initial messages array
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{
        role: "user",
        content: contextualPrompt
      }];
      
      // Get tools from Toolhouse with error handling
      let tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
      try {
        tools = await this.toolhouse.getTools() as OpenAI.Chat.Completions.ChatCompletionTool[];
        console.log(`🛠️ Using ${tools.length} available tools for agent: ${agentConfig.title}`);
      } catch (toolError) {
        console.warn('⚠️ Failed to fetch tools, proceeding without them:', toolError);
      }
      
      // First OpenAI call with tools
      console.log('🚀 Making initial OpenAI call with Toolhouse tools...');
      
      const chatCompletionParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        messages,
        model,
        ...(tools.length > 0 && { tools }),
        temperature: 0.7,
        max_tokens: 4000
      };
      
      const chatCompletion = await this.openai.chat.completions.create(chatCompletionParams);
      
      // Check if the model wants to use tools
      const message = chatCompletion.choices[0].message;
      
      if (message.tool_calls && tools.length > 0) {
        console.log(`🔧 Model requested ${message.tool_calls.length} tool calls`);
        
        try {
          // Run tools through Toolhouse
          console.log('⚡ Running tools through Toolhouse...');
          const toolResults = await this.toolhouse.runTools(chatCompletion) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];
          
          // Create new messages array with tool results
          const newMessages = [...messages, ...toolResults];
          
          // Second OpenAI call with tool results
          console.log('🔄 Making follow-up OpenAI call with tool results...');
          const chatCompleted = await this.openai.chat.completions.create({
            messages: newMessages,
            model,
            tools,
            temperature: 0.7,
            max_tokens: 4000
          });
          
          console.log(`✅ Agent "${agentConfig.title}" completed successfully with tools`);
          const finalContent = chatCompleted.choices[0].message.content;
          
          if (finalContent) {
            return this.formatAgentResponse(agentConfig, finalContent, true);
          }
        } catch (toolError) {
          console.error('❌ Error during tool execution:', toolError);
          // Fall back to using the initial response without tools
          const fallbackContent = message.content;
          if (fallbackContent) {
            return this.formatAgentResponse(agentConfig, fallbackContent, false, 'Tool execution failed, showing initial response');
          }
        }
      } else {
        // No tools were called, use the direct response
        console.log(`✅ Agent "${agentConfig.title}" completed successfully without tools`);
        const finalContent = message.content;
        
        if (finalContent) {
          return this.formatAgentResponse(agentConfig, finalContent, false);
        }
      }
      
      return this.formatErrorResponse('No Response', 'Agent completed but no response was generated');
      
    } catch (error) {
      console.error(`❌ Error running agent "${agentConfig.title}":`, error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Parse OpenAI-specific errors for better user feedback
      if (errorMessage.includes('insufficient_quota')) {
        return this.formatErrorResponse('Quota Exceeded', 'OpenAI API quota exceeded. Please check your billing.');
      } else if (errorMessage.includes('invalid_api_key')) {
        return this.formatErrorResponse('Invalid API Key', 'OpenAI API key is invalid or expired.');
      } else if (errorMessage.includes('rate_limit')) {
        return this.formatErrorResponse('Rate Limited', 'Too many requests. Please wait and try again.');
      } else if (errorMessage.includes('model_not_found')) {
        return this.formatErrorResponse('Model Error', `Model "${model}" not found. Please check your model selection.`);
      }
      
      return this.formatErrorResponse('Execution Error', errorMessage);
    }
  }

  // Enhanced original workflow method with better error handling
  async processToolhouseWorkflow(prompt: string, model: string = "gpt-4o-mini"): Promise<string> {
    if (!this.isInitialized() || !this.openai || !this.toolhouse) {
      const error = 'Services not properly initialized. Please check your API keys.';
      console.warn('⚠️', error);
      return this.formatErrorResponse('Initialization Error', error);
    }

    try {
      console.log(`⚡ Processing workflow with ${model}...`);
      console.log(`📝 Prompt: "${prompt.substring(0, 100)}..."`);
      
      // Create initial messages array
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{
        role: "user",
        content: prompt
      }];
      
      // Get tools from Toolhouse with error handling
      let tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
      try {
        tools = await this.toolhouse.getTools() as OpenAI.Chat.Completions.ChatCompletionTool[];
        console.log(`🛠️ Using ${tools.length} available tools`);
      } catch (toolError) {
        console.warn('⚠️ Failed to fetch tools, proceeding without them:', toolError);
      }
      
      // First OpenAI call with tools
      console.log('🚀 Making initial OpenAI call with Toolhouse tools...');
      
      const chatCompletionParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
        messages,
        model,
        ...(tools.length > 0 && { tools }),
        temperature: 0.7,
        max_tokens: 4000
      };
      
      const chatCompletion = await this.openai.chat.completions.create(chatCompletionParams);
      
      // Check if tools were called
      const message = chatCompletion.choices[0].message;
      
      if (message.tool_calls && tools.length > 0) {
        console.log(`🔧 Model requested ${message.tool_calls.length} tool calls`);
        
        try {
          // Run tools through Toolhouse
          console.log('⚡ Running tools through Toolhouse...');
          const toolResults = await this.toolhouse.runTools(chatCompletion) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];
          
          // Create new messages array with tool results
          const newMessages = [...messages, ...toolResults];
          
          // Second OpenAI call with tool results
          console.log('🔄 Making follow-up OpenAI call with tool results...');
          const chatCompleted = await this.openai.chat.completions.create({
            messages: newMessages,
            model,
            tools,
            temperature: 0.7,
            max_tokens: 4000
          });
          
          console.log('✅ Workflow completed successfully with tools');
          const finalContent = chatCompleted.choices[0].message.content;
          
          if (finalContent) {
            return this.formatResponse(finalContent, true);
          }
        } catch (toolError) {
          console.error('❌ Error during tool execution:', toolError);
          // Fall back to initial response
          const fallbackContent = message.content;
          if (fallbackContent) {
            return this.formatResponse(fallbackContent, false, 'Tool execution failed, showing initial response');
          }
        }
      } else {
        // No tools called, use direct response
        console.log('✅ Workflow completed successfully without tools');
        const finalContent = message.content;
        
        if (finalContent) {
          return this.formatResponse(finalContent, false);
        }
      }
      
      return this.formatErrorResponse('No Response', 'Workflow completed but no response generated');
      
    } catch (error) {
      console.error('❌ Error in Toolhouse workflow:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Parse OpenAI-specific errors
      if (errorMessage.includes('insufficient_quota')) {
        return this.formatErrorResponse('Quota Exceeded', 'OpenAI API quota exceeded. Please check your billing.');
      } else if (errorMessage.includes('invalid_api_key')) {
        return this.formatErrorResponse('Invalid API Key', 'OpenAI API key is invalid or expired.');
      } else if (errorMessage.includes('rate_limit')) {
        return this.formatErrorResponse('Rate Limited', 'Too many requests. Please wait and try again.');
      }
      
      return this.formatErrorResponse('Workflow Error', errorMessage);
    }
  }

  // Enhanced format response for agents with metadata
  private formatAgentResponse(
    agentConfig: ToolhouseAgentConfig, 
    response: string, 
    usedTools: boolean = false,
    warning?: string
  ): string {
    const metadata = [
      `**Agent:** ${agentConfig.title}`,
      `**ID:** \`${agentConfig.id}\``,
      `**Bundle:** ${agentConfig.bundle || 'default'}`,
      `**Tools Used:** ${usedTools ? '✅ Yes' : '❌ No'}`,
      `**Generated:** ${new Date().toLocaleTimeString()}`
    ];
    
    if (warning) {
      metadata.push(`**⚠️ Warning:** ${warning}`);
    }
    
    // If response already contains markdown, preserve it
    if (response.includes('```') || response.includes('**') || response.includes('##')) {
      return `${metadata.join('\n')}\n\n---\n\n${response}`;
    }
    
    // Otherwise, add basic markdown formatting
    return `${metadata.join('\n')}\n\n---\n\n${response}`;
  }

  // Enhanced format response with metadata
  private formatResponse(response: string, usedTools: boolean = false, warning?: string): string {
    const metadata = [
      `**AI Response** ${usedTools ? '(with tools)' : '(direct)'}`,
      `**Generated:** ${new Date().toLocaleTimeString()}`
    ];
    
    if (warning) {
      metadata.push(`**⚠️ Warning:** ${warning}`);
    }
    
    // If response already contains markdown, preserve it
    if (response.includes('```') || response.includes('**') || response.includes('##')) {
      return `${metadata.join('\n')}\n\n---\n\n${response}`;
    }
    
    // Otherwise, add basic markdown formatting
    return `${metadata.join('\n')}\n\n---\n\n${response}`;
  }

  // Standardized error formatting
  private formatErrorResponse(errorType: string, errorMessage: string): string {
    return `## ❌ ${errorType}\n\n**Error:** ${errorMessage}\n\n**Time:** ${new Date().toLocaleString()}\n\n**Suggested Actions:**\n- Check your API keys in the configuration\n- Verify your internet connection\n- Try again in a few moments\n- Contact support if the issue persists`;
  }

  // Method to get metadata about the current session
  getMetadata(): Record<string, any> {
    return this.toolhouse?.metadata || {};
  }

  // Method to update metadata
  setMetadata(key: string, value: any): void {
    if (this.toolhouse) {
      this.toolhouse.metadata = { ...this.toolhouse.metadata, [key]: value };
    }
  }

  // Method to get current tool count
  getToolCount(): number {
    return this.tools.length;
  }

  // Method to refresh tools cache
  async refreshTools(): Promise<number> {
    if (!this.isInitialized() || !this.toolhouse) {
      return 0;
    }
    
    try {
      this.tools = await this.toolhouse.getTools();
      console.log(`🔄 Refreshed tools cache: ${this.tools.length} tools available`);
      return this.tools.length;
    } catch (error) {
      console.error('❌ Failed to refresh tools:', error);
      return this.tools.length;
    }
  }

  // Check service health
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: Record<string, any> }> {
    const details: Record<string, any> = {
      initialized: this.initialized,
      toolhouseConnected: !!this.toolhouse,
      openaiConnected: !!this.openai,
      toolsLoaded: this.tools.length > 0,
      toolCount: this.tools.length
    };

    if (!this.isInitialized()) {
      return { status: 'unhealthy', details };
    }

    try {
      // Test Toolhouse connection
      await this.getTools();
      details.toolhouseTest = 'passed';
      
      // Test OpenAI connection with a minimal request
      if (this.openai) {
        const testResponse = await this.openai.chat.completions.create({
          messages: [{ role: 'user', content: 'Test connection' }],
          model: 'gpt-3.5-turbo',
          max_tokens: 1
        });
        details.openaiTest = testResponse ? 'passed' : 'failed';
      }
      
      return { status: 'healthy', details };
    } catch (error) {
      details.error = error instanceof Error ? error.message : String(error);
      return { status: 'unhealthy', details };
    }
  }
}

// Create singleton instance
const toolhouseService = new ToolhouseService();
export default toolhouseService;