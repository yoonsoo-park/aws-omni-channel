import { EventBridgeEvent, Context } from 'aws-lambda';
import { SQS } from 'aws-sdk';

const sqs = new SQS();

interface EventSchema {
	source: string;
	type: string;
	payload: any;
	metadata: {
		timestamp: string;
		correlationId: string;
	};
}

export const handler = async (event: EventBridgeEvent<string, EventSchema>, context: Context) => {
	try {
		console.log('Received event:', JSON.stringify(event, null, 2));

		// Validate event schema
		if (!validateEventSchema(event.detail)) {
			throw new Error('Invalid event schema');
		}

		// Route event based on source and type
		await routeEvent(event.detail);

		return {
			statusCode: 200,
			body: JSON.stringify({ message: 'Event processed successfully' }),
		};
	} catch (error) {
		console.error('Error processing event:', error);

		// Send to DLQ
		await sendToDLQ(event, error as Error);

		throw error;
	}
};

function validateEventSchema(event: EventSchema): boolean {
	return !!(
		event.source &&
		event.type &&
		event.metadata?.timestamp &&
		event.metadata?.correlationId
	);
}

async function routeEvent(event: EventSchema): Promise<void> {
	// Add routing logic based on event source and type
	switch (event.source) {
		case 'document-service':
			await handleDocumentEvent(event);
			break;
		case 'metadata-service':
			await handleMetadataEvent(event);
			break;
		default:
			console.log(`Unhandled event source: ${event.source}`);
	}
}

async function handleDocumentEvent(event: EventSchema): Promise<void> {
	// Implement document event handling logic
	console.log('Processing document event:', event.type);
}

async function handleMetadataEvent(event: EventSchema): Promise<void> {
	// Implement metadata event handling logic
	console.log('Processing metadata event:', event.type);
}

async function sendToDLQ(
	event: EventBridgeEvent<string, EventSchema>,
	error: Error,
): Promise<void> {
	const dlqUrl = process.env.DLQ_URL;
	if (!dlqUrl) {
		throw new Error('DLQ_URL environment variable not set');
	}

	await sqs
		.sendMessage({
			QueueUrl: dlqUrl,
			MessageBody: JSON.stringify({
				event,
				error: {
					message: error.message,
					stack: error.stack,
				},
				timestamp: new Date().toISOString(),
			}),
		})
		.promise();
}
