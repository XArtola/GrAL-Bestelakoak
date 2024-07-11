// to read env variables
require('dotenv').config();

// openai class
const { ChatOpenAI } = require("@langchain/openai");
//import { ChatOpenAI } from "@langchain/openai";

// template
const { ChatPromptTemplate } = require("@langchain/core/prompts");

// String parser
const { StringOutputParser } = require("@langchain/core/output_parsers");
// String parser instance
const outputParser = new StringOutputParser();


// Ejemplo en index.js
const express = require('express');
const app = express();

const apiKey = process.env.OPENAI_API_KEY;

// Define object to make calls
const chatModel = new ChatOpenAI({
    openAIApiKey: apiKey,
  });

// Cherio
const { CheerioWebBaseLoader } = require("langchain/document_loaders/web/cheerio");

const loader = new CheerioWebBaseLoader(
    "https://docs.smith.langchain.com/overview"
);
  

// Splitter

const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");

const splitter = new RecursiveCharacterTextSplitter();

// Embedding
const { OpenAIEmbeddings } = require("@langchain/openai");

const embeddings = new OpenAIEmbeddings();

// vectorstore
const { MemoryVectorStore } = require("langchain/vectorstores/memory");



const { createStuffDocumentsChain } = require("langchain/chains/combine_documents");
const { ChatPromptTemplate } = require("@langchain/core/prompts");


/*
const prompt = ChatPromptTemplate.fromTemplate(`Answer the following question based only on the provided context:

<context>
{context}
</context>

Question: {input}`);

const documentChain = await createStuffDocumentsChain({
  llm: chatModel,
  prompt,
});

*/

const { Document } = require("@langchain/core/documents");

await documentChain.invoke({
  input: "what is LangSmith?",
  context: [
    new Document({
      pageContent:
        "LangSmith is a platform for building production-grade LLM applications.",
    }),
  ],
});


async function pruebaVector() {
  try {
    //Llamada unica
    const docs = await loader.load();

    const splitDocs = await splitter.splitDocuments(docs);

    const vectorstore = await MemoryVectorStore.fromDocuments(
      splitDocs,
      embeddings
    );
    // Puedes hacer más cosas con la respuesta aquí
  } catch (error) {
    console.error("Error al invocar el modelo de chat:", error);
  }
}




async function pruebaSplitter() {
  try {
    //Llamada unica
    const docs = await loader.load();

    const splitDocs = await splitter.splitDocuments(docs);

    console.log(splitDocs.length);
    console.log(splitDocs[0].pageContent.length);
    // Puedes hacer más cosas con la respuesta aquí
  } catch (error) {
    console.error("Error al invocar el modelo de chat:", error);
  }
}



async function pruebaCheerio() {
  try {
    //Llamada unica
    const docs = await loader.load();
    console.log(docs.length);
    console.log(docs[0].pageContent.length);
    // Puedes hacer más cosas con la respuesta aquí
  } catch (error) {
    console.error("Error al invocar el modelo de chat:", error);
  }
}


// Define una función asincrónica para utilizar el await
async function consultarModelo() {
    try {
      //Llamada unica
      const respuesta = await chatModel.invoke("what is LangSmith?");
      console.log(respuesta);
      // Puedes hacer más cosas con la respuesta aquí
    } catch (error) {
      console.error("Error al invocar el modelo de chat:", error);
    }
  }

// Template to do call

const prompt = ChatPromptTemplate.fromMessages([
  ["system", "You are a world class technical documentation writer."],
  ["user", "{input}"],
]);

// Call with template

async function consultarModeloConTemplate() {
  try {
    //Llamada unica
    //const respuesta = await chatModel.invoke("what is LangSmith?");
    const chain = prompt.pipe(chatModel).pipe(outputParser);

    const respuesta = await chain.invoke({
      input: "what is LangSmith?",
    });

    console.log(respuesta);
    // Puedes hacer más cosas con la respuesta aquí
  } catch (error) {
    console.error("Error al invocar el modelo de chat:", error);
  }
}


  
// Llama a tu función asincrónica
//consultarModelo();

app.get('/', (req, res) => {
  res.send('¡Hola, mundo!');
});

const puerto = 3000;
app.listen(puerto, () => {
  console.log(`Servidor escuchando en el puerto ${puerto}`);
  //consultarModeloConTemplate();
  pruebaVector()
 
});
