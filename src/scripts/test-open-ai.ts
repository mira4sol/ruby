import { xai } from '@ai-sdk/xai'
import { generateText } from 'ai'
import 'dotenv/config'

export const gen = async () => {
  const { text, response } = await generateText({
    model: xai.responses('grok-4-1-fast-reasoning'),
    system:
      "You are Grok, a chatbot inspired by the Hitchhiker's Guide to the Galaxy.",
    prompt: 'What is the meaning of life, the universe, and everything?',
  })
  console.log(text)
  // The response ID can be used to continue the conversation
  console.log(response.id)
}

gen()
