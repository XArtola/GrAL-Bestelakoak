import { SupabaseVectorStore } from 'langchain/vectorstores/supabase'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { createClient } from '@supabase/supabase-js'

//import 'dotenv/config' 

const openAIApiKey ="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" //process.env.OPENAI_API_KEY
//
const embeddings = new OpenAIEmbeddings({ openAIApiKey })
const sbApiKey ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyc3ZwcW9nZHRkdm9kZnhmYXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDY2MzMwMTEsImV4cCI6MjAyMjIwOTAxMX0.w18bpVAAc4Io-dn_4YpHtbcURmsheUj1zqJ0rrDBGbk" //process.env.SUPABASE_API_KEY
const sbUrl ="https://arsvpqogdtdvodfxfaxb.supabase.co" //process.env.SUPABASE_URL_LC_CHATBOT
const client = createClient(sbUrl, sbApiKey)

const vectorStore = new SupabaseVectorStore(embeddings, {
    client,
    tableName: 'documents',
    queryName: 'match_documents'
})

const retriever = vectorStore.asRetriever()

export { retriever }