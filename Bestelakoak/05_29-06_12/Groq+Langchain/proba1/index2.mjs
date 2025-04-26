import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import readline from "readline";

const model = new ChatGroq({
  //apiKey: process.env.GROQ_API_KEY,
  apiKey: "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",
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(conversation = []) {

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are a helpful assistant"],
    ["human", "{input}"],
    ...conversation.map(([input, response]) => (["human", input], ["system", response]))
  ]);
  

  rl.question('Please enter your input: ', async (input) => {
    // Do something with the user input
    console.log('User input:', input);

    const chain = prompt.pipe(model);
    const response = await chain.invoke({
      input: input,
      conversation: conversation,
    });
    console.log("\n Bot response:", response.lc_kwargs.content);

    conversation.push([input, response.lc_kwargs.content]); // Add current input and bot response to conversation

    askQuestion(conversation); // Ask the next question with updated conversation
  });
}

askQuestion([]);
