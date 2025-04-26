import OpenAI from "openai"
import { ChatCompletionCreateParamsStreaming, ChatCompletionMessageParam } from "openai/resources/chat/completions"

export interface TargonClientConfig {
	/** Your API key for authentication */
	apiKey: string
	/**
	 * If true, uses OpenRouter’s API endpoint to forward requests to Targon.
	 * Otherwise, it calls Targon’s API directly.
	 */
	useOpenRouter?: boolean
	/** Optionally override the base URL */
	baseURL?: string
}

/**
 * TargonClient encapsulates integration with the Targon API (or OpenRouter's API that calls Targon).
 */
export class TargonClient {
	private client: OpenAI

	constructor(private config: TargonClientConfig) {
		const defaultBaseURL = config.useOpenRouter ? "https://api.openrouter.com/v1" : "https://api.targon.com/v1"
		const baseURL = config.baseURL || defaultBaseURL

		// Initialize the OpenAI client with the chosen baseURL and API key.
		this.client = new OpenAI({
			baseURL,
			apiKey: config.apiKey,
			dangerouslyAllowBrowser: true,
		})
	}

	/**
	 * Calls the chat completions endpoint with a streaming response.
	 *
	 * @param params - Chat parameters including the model, messages array, and other options.
	 */
	async chatCompletion(params: {
		model: string
		messages: ChatCompletionMessageParam[]
		temperature?: number
		max_tokens?: number
		top_p?: number
		frequency_penalty?: number
		presence_penalty?: number
	}): Promise<void> {
		try {
			// Call the chat completions endpoint with streaming enabled.
			const stream = await this.client.chat.completions.create({
				...params,
				stream: true,
			})
			// Stream and write each chunk to stdout.
			for await (const chunk of stream) {
				const content = chunk.choices[0]?.delta?.content || ""
				process.stdout.write(content)
			}
		} catch (error) {
			console.error("Error during chat completion:", error)
		}
	}

	/**
	 * Calls the text completions endpoint with a streaming response.
	 *
	 * @param params - Completion parameters including the model, prompt, and other options.
	 */
	async textCompletion(params: {
		model: string
		prompt: string
		temperature?: number
		max_tokens?: number
		top_p?: number
		frequency_penalty?: number
		presence_penalty?: number
	}): Promise<void> {
		try {
			// Call the text completions endpoint with streaming enabled.
			const stream = await this.client.completions.create({
				stream: true,
				...params,
			})
			// Stream and write each chunk to stdout.
			for await (const chunk of stream) {
				const text = chunk.choices[0]?.text || ""
				process.stdout.write(text)
			}
		} catch (error) {
			console.error("Error during text completion:", error)
		}
	}
}
