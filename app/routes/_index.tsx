import OpenAI from 'openai'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { useChat } from 'ai/react'
import { useEffect, useRef } from 'react'
import { Form } from '@remix-run/react'
import { ActionFunctionArgs } from '@remix-run/node'

const openai = new OpenAI({
	apiKey: import.meta.env.OPENAI_API_KEY
})

export async function action({ request }: ActionFunctionArgs) {
	const { messages } = await request.json()

	// Ask OpenAI for a streaming chat completion given the prompt
	const response = await openai.chat.completions.create({
		model: 'gpt-3.5-turbo',
		stream: true,
		messages: [
			{
				role: 'system',
				content:
					'You are a professional chef. You provide detailed cooking instructions, tips, and advice on selecting the best ingredients.'
			},
			...messages
		]
	})

	// Convert the response into a friendly text-stream
	const stream = OpenAIStream(response)

	// Respond with the stream
	return new StreamingTextResponse(stream)
}

export default function Chat() {
	const {
		messages,
		input,
		handleInputChange,
		handleSubmit,
		isLoading,
		append
	} = useChat({ api: '/?index' })

	const messagesContainerRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		// hack to remove html content from ai messages
		messages.map(message => {
			if (message.role === 'assistant') {
				const pattern = /,"actionData":\{"routes\/_index":"([^"]+)"\}/
				const matches = pattern.exec(message.content)
				if (matches?.[1]) {
					messages.pop()
					messages.push({ ...message, content: matches[1] })
				}
			}
		})

		if (messagesContainerRef.current) {
			messagesContainerRef.current.scrollTop =
				messagesContainerRef.current.scrollHeight
		}
	}, [messages])

	return (
		<div className="flex flex-col w-full h-screen max-w-md py-24 mx-auto stretch">
			<div className="overflow-auto mb-8 w-full" ref={messagesContainerRef}>
				{messages.map(m => (
					<div
						key={m.id}
						className={`whitespace-pre-wrap break-words ${
							m.role === 'user'
								? 'p-3 m-2 rounded-lg'
								: 'bg-slate-300 p-3 m-2 mb-9 rounded-lg'
						}`}
					>
						{m.content}
					</div>
				))}
				{isLoading && (
					<div className="flex justify-end pr-4">
						<span className="animate-bounce">...</span>
					</div>
				)}
			</div>
			<div className="fixed bottom-0 w-full max-w-md">
				<div className="flex flex-col justify-center mb-2 items-center">
					<button
						type="button"
						className="bg-blue-500 p-2 text-white rounded shadow-xl"
						disabled={isLoading}
						onClick={() =>
							append({ role: 'user', content: 'Give me a random recipe' })
						}
					>
						Random Recipe
					</button>
				</div>
				<Form
					method="post"
					onSubmit={handleSubmit}
					className="flex justify-center"
				>
					<input
						type="hidden"
						name="messages"
						value={JSON.stringify(messages)}
					/>
					<input
						className="w-[95%] p-2 mb-8 border border-gray-300 rounded shadow-xl text-black"
						disabled={isLoading}
						value={input}
						placeholder="Say something..."
						onChange={handleInputChange}
						name="message"
					/>
				</Form>
			</div>
		</div>
	)
}
