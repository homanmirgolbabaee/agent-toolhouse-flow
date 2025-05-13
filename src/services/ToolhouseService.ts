
import { Toolhouse } from "@toolhouseai/sdk";
import OpenAI from "openai";

class ToolhouseService {
  private toolhouse: any;
  private openai: OpenAI | null = null;
  private initialized = false;
  private tools: any[] = [];

  async initialize(toolhouseApiKey: string, openaiApiKey: string, metadata = {}) {
    try {
      console.log('Initializing Toolhouse service');
      this.toolhouse = new Toolhouse({
        apiKey: toolhouseApiKey,
        metadata
      });

      // Add the dangerouslyAllowBrowser flag to allow browser usage
      this.openai = new OpenAI({
        apiKey: openaiApiKey,
        dangerouslyAllowBrowser: true // Added this flag to enable browser usage
      });

      this.initialized = true;
      console.log('Toolhouse service initialized');
      
      // Get available tools
      this.tools = await this.toolhouse.getTools();
      console.log(`Retrieved ${this.tools.length} tools`);
      
      return true;
    } catch (error) {
      console.error('Failed to initialize Toolhouse:', error);
      return false;
    }
  }

  isInitialized() {
    return this.initialized;
  }

  async getTools() {
    if (!this.initialized) {
      console.warn('Toolhouse not initialized');
      return [];
    }
    
    try {
      if (this.tools.length === 0) {
        this.tools = await this.toolhouse.getTools();
      }
      return this.tools;
    } catch (error) {
      console.error('Failed to get tools:', error);
      return [];
    }
  }

  async runTools(openAIResponse: any) {
    if (!this.initialized) {
      console.warn('Toolhouse not initialized');
      return null;
    }
    
    try {
      const result = await this.toolhouse.runTools(openAIResponse);
      return result;
    } catch (error) {
      console.error('Failed to run Toolhouse tools:', error);
      return null;
    }
  }

  // Method to process a workflow with actual API calls
  async processToolhouseWorkflow(prompt: string, model: string = "gpt-4o-mini") {
    if (!this.initialized || !this.openai) {
      console.warn('Toolhouse or OpenAI not initialized');
      return "Error: Toolhouse or OpenAI not initialized";
    }

    try {
      console.log(`Processing prompt: "${prompt}" with model: ${model}`);
      
      // Create initial messages array with the correct type
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [{
        role: "user" as const,
        content: prompt
      }];
      
      // Get tools from Toolhouse
      const tools = await this.getTools();
      
      // First OpenAI call with tools
      console.log("Making first OpenAI call with tools...");
      const chatCompletion = await this.openai.chat.completions.create({
        messages,
        model,
        tools
      });
      
      // Run tools on the response
      console.log("Running tools on OpenAI response...");
      const openAiMessage = await this.runTools(chatCompletion) as OpenAI.Chat.Completions.ChatCompletionMessageParam[];
      
      // Second OpenAI call with tool results
      console.log("Making second OpenAI call with tool results...");
      const newMessages = [...messages, ...openAiMessage];
      const chatCompleted = await this.openai.chat.completions.create({
        messages: newMessages,
        model,
        tools
      });
      
      // Extract the final response
      console.log("Processing complete");
      const finalResponse = chatCompleted.choices[0].message.content;
      return finalResponse;
    } catch (error) {
      console.error('Error in Toolhouse workflow:', error);
      return `Error processing workflow: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

// Create singleton instance
const toolhouseService = new ToolhouseService();
export default toolhouseService;
