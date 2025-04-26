import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";

const model = new ChatGroq({
  //apiKey: process.env.GROQ_API_KEY,
  apiKey: "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",
});
const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant"],
  ["human", "{input}"],
]);
const chain = prompt.pipe(model);
const response = await chain.invoke({
  input: "Which is the highest mountain in the world?",
});
console.log("response", response);
/**
response AIMessage {
  content: "Hello! I'm happy to assist you in any way I can. Is there something specific you need help with or a question you have?",
}
 */