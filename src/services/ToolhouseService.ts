
import { Toolhouse } from "@toolhouseai/sdk";

class ToolhouseService {
  private toolhouse: any;
  private initialized = false;
  private tools: any[] = [];

  async initialize(apiKey: string, metadata = {}) {
    try {
      console.log('Initializing Toolhouse service');
      this.toolhouse = new Toolhouse({
        apiKey,
        metadata
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

  // Helper method for our example to simplify the workflow process
  async processToolhouseWorkflow(prompt: string, model: string = "gpt-4o-mini") {
    if (!this.initialized) {
      console.warn('Toolhouse not initialized');
      return "Error: Toolhouse not initialized";
    }

    try {
      // In a real implementation, this would call OpenAI and Toolhouse
      // Since we're just simulating in the frontend, we'll return a mock response
      
      console.log(`Processing prompt: "${prompt}" with model: ${model}`);
      
      // Mock a delay to simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return `Here's a summary of Toolhouse.ai based on your prompt:\n\n• Toolhouse is an AI tool orchestration platform\n• It allows developers to create powerful AI agents\n• The platform provides tools that can be integrated with LLMs\n• It supports various models including OpenAI's GPT series\n• Toolhouse offers both cloud-hosted and local execution options`;
    } catch (error) {
      console.error('Error in Toolhouse workflow:', error);
      return `Error processing workflow: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}

// Create singleton instance
const toolhouseService = new ToolhouseService();
export default toolhouseService;
