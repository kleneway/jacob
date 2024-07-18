import { OpenAI } from "openai";
// import { encode } from "gpt-tokenizer";
import type { SafeParseSuccess, ZodSchema } from "zod";
import { parse } from "jsonc-parser";
import { type Message } from "~/types";

import { removeMarkdownCodeblocks } from "~/app/utils";
import { parseTemplate, type BaseEventData } from "../utils";
import { emitPromptEvent } from "../utils/events";
import {
  type ChatCompletionCreateParamsStreaming,
  type ChatCompletionChunk,
  type ChatCompletionTool,
  type ChatCompletionToolChoiceOption,
} from "openai/resources/chat/completions";
import { type Stream } from "openai/streaming";
import {
  sendAnthropicRequest,
  sendAnthropicToolRequest,
} from "../anthropic/request";

const PORTKEY_GATEWAY_URL = "https://api.portkey.ai/v1";

const CONTEXT_WINDOW = {
  "gpt-4-turbo-2024-04-09": 128000,
  "gpt-4-0125-preview": 128000,
  "gpt-4o-2024-05-13": 128000,
  "gemini-1.5-pro-latest": 1048576,
  "gemini-1.5-flash-latest": 1048576,
  "claude-3-opus-20240229": 200000,
  "claude-3-haiku-20240307": 200000,
  "claude-3-5-sonnet-20240620": 200000,
  "llama-3-sonar-large-32k-online": 32768,
  "llama-3-sonar-small-32k-online": 32768,
};

// Note that gpt-4-turbo-2024-04-09 has a max_tokens limit of 4K, despite having a context window of 128K
export const MAX_OUTPUT = {
  "gpt-4-turbo-2024-04-09": 4096,
  "gpt-4-0125-preview": 4096,
  "gpt-4o-2024-05-13": 4096,
  "gemini-1.5-pro-latest": 8192,
  "gemini-1.5-flash-latest": 8192,
  "claude-3-opus-20240229": 4096,
  "claude-3-haiku-20240307": 4096,
  "claude-3-5-sonnet-20240620": 4096,
  "llama-3-sonar-large-32k-online": 4096,
  "llama-3-sonar-small-32k-online": 4096,
};

const ONE_MILLION = 1000000;
const INPUT_TOKEN_COSTS = {
  "gpt-4-turbo-2024-04-09": 10 / ONE_MILLION,
  "gpt-4-0125-preview": 10 / ONE_MILLION,
  "gpt-4o-2024-05-13": 10 / ONE_MILLION,
  "gemini-1.5-pro-latest": 3.5 / ONE_MILLION,
  "gemini-1.5-flash-latest": 0.35 / ONE_MILLION,
  "claude-3-opus-20240229": 15 / ONE_MILLION,
  "claude-3-haiku-20240307": 0.25 / ONE_MILLION,
  "claude-3-5-sonnet-20240620": 3 / ONE_MILLION,
  "llama-3-sonar-large-32k-online": 1 / ONE_MILLION,
  "llama-3-sonar-small-32k-online": 1 / ONE_MILLION,
};
const OUTPUT_TOKEN_COSTS = {
  "gpt-4-turbo-2024-04-09": 30 / ONE_MILLION,
  "gpt-4-0125-preview": 30 / ONE_MILLION,
  "gpt-4o-2024-05-13": 30 / ONE_MILLION,
  "gemini-1.5-pro-latest": 10.5 / ONE_MILLION,
  "gemini-1.5-flash-latest": 1.05 / ONE_MILLION,
  "claude-3-opus-20240229": 75 / ONE_MILLION,
  "claude-3-haiku-20240307": 1.25 / ONE_MILLION,
  "claude-3-5-sonnet-20240620": 15 / ONE_MILLION,
  "llama-3-sonar-large-32k-online": 1 / ONE_MILLION,
  "llama-3-sonar-small-32k-online": 1 / ONE_MILLION,
};
const PORTKEY_VIRTUAL_KEYS = {
  "gpt-4-turbo-2024-04-09": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4-0125-preview": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gpt-4o-2024-05-13": process.env.PORTKEY_VIRTUAL_KEY_OPENAI,
  "gemini-1.5-pro-latest": process.env.PORTKEY_VIRTUAL_KEY_GOOGLE,
  "gemini-1.5-flash-latest": process.env.PORTKEY_VIRTUAL_KEY_GOOGLE,
  "claude-3-opus-20240229": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
  "claude-3-haiku-20240307": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
  "claude-3-5-sonnet-20240620": process.env.PORTKEY_VIRTUAL_KEY_ANTHROPIC,
  "llama-3-sonar-large-32k-online": process.env.PORTKEY_VIRTUAL_KEY_PERPLEXITY,
  "llama-3-sonar-small-32k-online": process.env.PORTKEY_VIRTUAL_KEY_PERPLEXITY,
};

export type Model = keyof typeof CONTEXT_WINDOW;

export const getMaxTokensForResponse = async (
  inputText: string,
  model: Model,
): Promise<number> => {
  try {
    return MAX_OUTPUT[model];
    // const tokens = encode(inputText);
    // const numberOfInputTokens = tokens.length;

    // const maxContextTokens = CONTEXT_WINDOW[model];
    // const padding = Math.ceil(maxContextTokens * 0.01);

    // const maxTokensForResponse =
    //   maxContextTokens - numberOfInputTokens - padding;

    // if (maxTokensForResponse <= 0) {
    //   throw new Error(
    //     "Input text is too large to fit within the context window.",
    //   );
    // }

    // return Math.min(maxTokensForResponse, MAX_OUTPUT[model]);
  } catch (error) {
    console.log("Error in getMaxTokensForResponse: ", error);
    return Math.round(CONTEXT_WINDOW[model] / 2);
  }
};

export const sendGptRequest = async (
  userPrompt: string,
  systemPrompt = "You are a helpful assistant.",
  temperature = 0.2,
  baseEventData: BaseEventData | undefined = undefined,
  retries = 10,
  delay = 60000, // rate limit is 40K tokens per minute, so by default start with 60 seconds
  imagePrompt: OpenAI.Chat.ChatCompletionMessageParam | null = null,
  model: Model = "claude-3-5-sonnet-20240620",
  isJSONMode = false,
): Promise<string | null> => {
  // console.log("\n\n --- User Prompt --- \n\n", userPrompt);
  // console.log("\n\n --- System Prompt --- \n\n", systemPrompt);

  try {
    // For now, if we get a request to use Sonnet 3.5, we will call the anthropic SDK directly. This is because the portkey gateway does not support several features for the claude model yet.
    if (model === "claude-3-5-sonnet-20240620" && !isJSONMode) {
      return sendAnthropicRequest(
        userPrompt,
        systemPrompt,
        temperature,
        baseEventData,
        retries,
        delay,
      );
    }

    const openai = new OpenAI({
      apiKey: "using-virtual-portkey-key",
      baseURL: PORTKEY_GATEWAY_URL,
      defaultHeaders: {
        "x-portkey-api-key": process.env.PORTKEY_API_KEY,
        "x-portkey-virtual-key": PORTKEY_VIRTUAL_KEYS[model],
        "x-portkey-cache": "simple",
        "x-portkey-retry-count": "3",
        "x-portkey-debug": `${process.env.NODE_ENV !== "production"}`,
      },
    });

    const max_tokens = await getMaxTokensForResponse(
      userPrompt + systemPrompt,
      model,
    );

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ] as OpenAI.Chat.ChatCompletionMessageParam[];

    if (imagePrompt) {
      messages.unshift(imagePrompt);
    }
    // Temp fix, portkey doesn't currently support json mode for claude
    const needsJsonHelper = isJSONMode && model.includes("claude");

    if (needsJsonHelper) {
      messages.push({
        role: "assistant",
        content:
          "Here is the requested JSON that adheres perfectly to the schema noted above:\n```json\n{",
      });
    }

    console.log(`\n +++ Calling ${model} with max_tokens: ${max_tokens} `);
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens,
      temperature,
    });
    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(`\n +++ ${model} Response time ${duration} ms`);

    const gptResponse = response.choices[0]?.message;
    // console.log("\n\n --- GPT Response --- \n\n", gptResponse);
    let content = gptResponse?.content ?? "";
    if (needsJsonHelper) {
      content = `{${content}`; // add the starting bracket back to the JSON response
    }

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    const tokens = inputTokens + outputTokens;
    const cost =
      inputTokens * INPUT_TOKEN_COSTS[model] +
      outputTokens * OUTPUT_TOKEN_COSTS[model];
    if (baseEventData) {
      // send an internal event to track the prompts, timestamp, cost, tokens, and other data
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await emitPromptEvent({
        ...baseEventData,
        cost,
        tokens,
        duration,
        model,
        requestPrompts: messages.map((message) => ({
          promptType: (message.role?.toUpperCase() ?? "User") as
            | "User"
            | "System"
            | "Assistant",
          prompt:
            typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content),
        })),
        responsePrompt: content,
      });
    }

    return content;
  } catch (error) {
    if (
      retries === 0 ||
      (error as { response?: Response })?.response?.status !== 429
    ) {
      console.error(`Error in GPT request: ${String(error)}`);
      throw error;
    } else {
      console.log(
        `Received 429, retries remaining: ${retries}. Retrying in ${delay} ms...`,
      );
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          sendGptRequest(
            userPrompt,
            systemPrompt,
            temperature,
            baseEventData,
            retries - 1,
            delay * 2,
          )
            .then(resolve)
            .catch(reject);
        }, delay);
      });
    }
  }
};

// Return type should be a ZodSchema or an array of ZodSchema objects
export const sendGptRequestWithSchema = async (
  userPrompt: string,
  systemPrompt: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zodSchema: ZodSchema<any>,
  temperature = 0.2,
  baseEventData: BaseEventData | undefined = undefined,
  retries = 3,
  model: Model = "claude-3-5-sonnet-20240620",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
  let extractedInfo;
  let retryCount = 0; // Initialize a retry counter

  // Loop until a valid response is received or the maxRetries limit is reached
  while (retryCount < retries) {
    let gptResponse: string | null = null;
    // if retries is greater than 0, slightly modify the system prompt to avoid hitting the same issue via cache
    if (retryCount > 0) {
      systemPrompt = `Attempt #${retryCount + 1} - ${systemPrompt}`;
    }

    try {
      gptResponse = await sendGptRequest(
        userPrompt,
        systemPrompt,
        temperature, // Use a lower temperature for retries
        baseEventData,
        0,
        60000,
        null,
        model,
        true,
      );

      if (!gptResponse) {
        throw new Error("/n/n/n/n **** Empty response from GPT **** /n/n/n/n");
      }
      // console.log("GPT Response: ", gptResponse);
      // Remove any code blocks from the response prior to attempting to parse it
      gptResponse = removeMarkdownCodeblocks(gptResponse);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      extractedInfo = parse(gptResponse);
      // console.log("Extracted Info: ", extractedInfo);
      // if the response is an array of objects, validate each object individually and return the full array if successful
      if (Array.isArray(extractedInfo)) {
        const validatedInfo = extractedInfo.map(
          (info) => zodSchema.safeParse(info), // as SafeParseReturnType<any, any>,
        );
        // console.log("validatedInfo: ", validatedInfo);
        const failedValidations = validatedInfo.filter(
          (result) => result.success === false,
        );

        if (failedValidations.length > 0) {
          throw new Error(
            `Invalid response from GPT - object is not able to be parsed using the provided schema: ${JSON.stringify(
              failedValidations,
            )}`,
          );
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return
        return (validatedInfo as SafeParseSuccess<any>[]).map(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          (result) => result.data,
        );
      }

      // if the response is a single object, validate it and return it if successful
      const validationResult = zodSchema.safeParse(
        extractedInfo,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      );

      if (validationResult.success) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return validationResult.data;
      }

      throw new Error(
        `Invalid response from GPT - object is not able to be parsed using the provided schema: ${JSON.stringify(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          validationResult.error,
        )}`,
      );
    } catch (error) {
      console.log(
        `Error occurred during GPT request: ${
          (error as { message?: string })?.message?.substring(0, 200) ?? ""
        }`,
      );
      retryCount++;
    }
  }

  throw new Error(
    `Max retries exceeded for GPT request: ${userPrompt.substring(0, 200)}`,
  );
};

export const sendGptVisionRequest = async (
  userPrompt: string,
  systemPrompt = "You are a helpful assistant.",
  snapshotUrl = "",
  temperature = 0.2,
  baseEventData: BaseEventData | undefined = undefined,
  retries = 3,
  delay = 60000,
): Promise<string | null> => {
  const model: Model = "gpt-4o-2024-05-13";

  if (!snapshotUrl?.length) {
    // TODO: change this to sendSelfConsistencyChainOfThoughtGptRequest(
    return sendGptRequest(
      userPrompt,
      systemPrompt,
      temperature,
      baseEventData,
      retries,
      delay,
      null,
    );
  }
  let imagePrompt = null;
  if (snapshotUrl?.length > 0) {
    const prompt = parseTemplate("dev", "vision", "user", {});

    // download the image data if needed
    // const url = await fetchImageAsBase64(snapshotUrl);
    // if (!url) {
    //   throw new Error("Failed to download image data");
    // }

    imagePrompt = {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: snapshotUrl,
            detail: "high",
          },
        },
        {
          type: "text",
          text: prompt,
        },
      ],
    } as OpenAI.Chat.ChatCompletionMessageParam;
  }

  return sendGptRequest(
    userPrompt,
    systemPrompt,
    temperature,
    baseEventData,
    retries,
    delay,
    imagePrompt,
    model,
  );
};

export const OpenAIStream = async (
  model: Model = "gpt-4o-2024-05-13",
  messages: Message[],
  systemPrompt = "You are a helpful friendly assistant.",
  temperature = 1,
): Promise<Stream<ChatCompletionChunk>> => {
  try {
    const openai = new OpenAI({
      apiKey: "using-virtual-portkey-key",
      baseURL: PORTKEY_GATEWAY_URL,
      defaultHeaders: {
        "x-portkey-api-key": process.env.PORTKEY_API_KEY,
        "x-portkey-virtual-key": PORTKEY_VIRTUAL_KEYS[model],
        "x-portkey-cache": "simple",
        "x-portkey-retry-count": "3",
        "x-portkey-debug": `${process.env.NODE_ENV !== "production"}`,
      },
    });

    let max_tokens = 0;
    const content =
      systemPrompt +
      messages.map((msg) => msg.role + " " + msg.content).join(" ");
    try {
      max_tokens = await getMaxTokensForResponse(content, model);
    } catch (error) {
      // update the model to 16K if the input text is too large
      console.log(
        "NOTE: Input text is too large to fit within the context window.",
      );
      model = "gemini-1.5-pro-latest";
    }
    try {
      if (!max_tokens) {
        max_tokens = await getMaxTokensForResponse(content, model);
      }
    } catch (error) {
      console.log("Error in getMaxTokensForResponse: ", error);
      max_tokens = Math.round(CONTEXT_WINDOW[model] / 2);
    }
    if (!max_tokens) {
      max_tokens = Math.round(CONTEXT_WINDOW[model] / 2);
    }

    console.log(`\n +++ Calling ${model} with max_tokens: ${max_tokens} `);

    const chatCompletionParams: ChatCompletionCreateParamsStreaming = {
      model: model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...messages.map((msg) => ({ role: msg.role, content: msg.content })),
      ],
      temperature,
      max_tokens,
      stream: true,
    };

    // Start the streaming session with OpenAI
    return openai.chat.completions.create(chatCompletionParams);
  } catch (error) {
    console.error("Error creating chat completion:", error);
    throw error;
  }
};

export const sendGptToolRequest = async (
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
  tools: ChatCompletionTool[],
  temperature = 0.3,
  baseEventData: BaseEventData | undefined = undefined,
  retries = 3,
  delay = 60000,
  model: Model = "gpt-4-turbo-2024-04-09",
  toolChoice: ChatCompletionToolChoiceOption = "auto",
  parallelToolCalls = false,
): Promise<OpenAI.Chat.ChatCompletion> => {
  const openai = new OpenAI({
    apiKey: "using-virtual-portkey-key",
    baseURL: PORTKEY_GATEWAY_URL,
    defaultHeaders: {
      "x-portkey-api-key": process.env.PORTKEY_API_KEY,
      "x-portkey-virtual-key": PORTKEY_VIRTUAL_KEYS[model],
      "x-portkey-cache": "simple",
      "x-portkey-retry-count": "3",
      "x-portkey-debug": `${process.env.NODE_ENV !== "production"}`,
    },
  });

  try {
    // For now, if we get a request to use Sonnet 3.5, we will call the anthropic SDK directly. This is because the portkey gateway does not support several features for the claude model yet.
    if (model === "claude-3-5-sonnet-20240620") {
      return sendAnthropicToolRequest(
        messages,
        tools,
        temperature,
        baseEventData,
        retries,
        delay,
      );
    }
    const max_tokens = await getMaxTokensForResponse("tool request", model);

    console.log(
      `\n +++ Calling ${model} with max_tokens: ${max_tokens} for tool request`,
    );
    const startTime = Date.now();

    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens,
      temperature,
      tools,
      tool_choice: toolChoice,
      ...(parallelToolCalls ? { parallel_tool_calls: true } : {}),
    });

    const endTime = Date.now();
    const duration = endTime - startTime;
    console.log(
      `\n +++ ${model} Response time ${duration} ms for tool request`,
    );

    const inputTokens = response.usage?.prompt_tokens ?? 0;
    const outputTokens = response.usage?.completion_tokens ?? 0;
    const tokens = inputTokens + outputTokens;
    const cost =
      inputTokens * INPUT_TOKEN_COSTS[model] +
      outputTokens * OUTPUT_TOKEN_COSTS[model];

    if (baseEventData) {
      await emitPromptEvent({
        ...baseEventData,
        cost,
        tokens,
        duration,
        model,
        requestPrompts: messages.map((message) => ({
          promptType: (message.role?.toUpperCase() ?? "User") as
            | "User"
            | "System"
            | "Assistant",
          prompt:
            typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content),
        })),
        responsePrompt: JSON.stringify(response.choices[0]?.message),
      });
    }

    return response;
  } catch (error) {
    if (
      retries === 0 ||
      !(error instanceof Error) ||
      (error as { response?: Response })?.response?.status !== 429
    ) {
      console.error(
        `Error in GPT tool request: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    } else {
      console.log(
        `Received 429, retries remaining: ${retries}. Retrying in ${delay} ms...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendGptToolRequest(
        messages,
        tools,
        temperature,
        baseEventData,
        retries - 1,
        delay * 2,
        model,
        toolChoice,
        parallelToolCalls,
      );
    }
  }
};
