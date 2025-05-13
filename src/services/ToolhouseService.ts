import { Toolhouse } from "@toolhouseai/sdk";
import OpenAI from "openai";

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

  // Following the exact pattern from Toolhouse TypeScript quickstart
  async processToolhouseWorkflow(prompt: string, model: string = "gpt-4o-mini"): Promise<string> {
    if (!this.isInitialized() || !this.openai || !this.toolhouse) {
      console.warn('⚠️ Toolhouse or OpenAI not initialized');
      return "❌ Error: Services not properly initialized";
    }

    try {
      console.log(`⚡ Processing prompt with ${model}...`);
      console.log(`📝 Prompt: "${prompt.substring(0, 100)}..."`);
      
      // Create initial messages array following the exact pattern from docs
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{
        role: "user",
        content: prompt
      }];
      
      // Get tools from Toolhouse
      const tools = await this.toolhouse.getTools() as OpenAI.Chat.Completions.ChatCompletionTool[];
      console.log(`🛠️ Using ${tools.length} available tools`);
      
      // First OpenAI call with tools - following docs pattern exactly
      console.log('🚀 Making initial OpenAI call with Toolhouse tools...');
      const chatCompletion = await this.openai.chat.completions.create({
        messages,
        model,
        tools
      });
      
      // Run tools through Toolhouse - following docs pattern exactly
      console.log('⚡ Running tools through Toolhouse...');
      const openAiMessage = await this.toolhouse.runTools(chatCompletion) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];
      
      // Create new messages array with tool results - following docs pattern exactly
      const newMessages = [...messages, ...openAiMessage];
      
      // Second OpenAI call with tool results - following docs pattern exactly
      console.log('🔄 Making follow-up OpenAI call with tool results...');
      const chatCompleted = await this.openai.chat.completions.create({
        messages: newMessages,
        model,
        tools
      });
      
      console.log('✅ Workflow completed successfully');
      const finalContent = chatCompleted.choices[0].message.content;
      
      // Enhanced response formatting for better markdown display
      if (finalContent) {
        return this.formatResponse(finalContent);
      }
      
      return 'Workflow completed but no response generated';
      
    } catch (error) {
      console.error('❌ Error in Toolhouse workflow:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return `❌ **Workflow Error**\n\nAn error occurred while processing your request:\n\n\`\`\`\n${errorMessage}\n\`\`\`\n\nPlease check your API keys and try again.`;
    }
  }

  // Format response to ensure proper markdown rendering
  private formatResponse(response: string): string {
    // If the response already contains markdown formatting, return as-is
    if (response.includes('```') || response.includes('**') || response.includes('##')) {
      return response;
    }
    
    // Otherwise, add some basic markdown formatting for better display
    return `## 🤖 AI Response\n\n${response}`;
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
}

// Create singleton instance
const toolhouseService = new ToolhouseService();
export default toolhouseService;