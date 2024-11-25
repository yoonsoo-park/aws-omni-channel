import {
	GetObjectCommand,
	S3Client,
	PutObjectCommand,
	PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export const s3Client = new S3Client({});

export interface S3FetchParams {
	bucketName: string;
	key: string;
	responseType?: 'json' | 'text' | 'binary';
}

export interface S3UploadParams {
	bucketName: string;
	key: string;
	body: string | Buffer | Uint8Array;
	contentType?: string;
}

/**
 * Uploads an object to an Amazon S3 bucket.
 *
 * @param {Object} params - The parameters required to upload to S3.
 * @param {string} params.bucketName - The name of the S3 bucket where the object will be uploaded.
 * @param {string} params.key - The key (or path) under which the object will be stored in the S3 bucket.
 * @param {Buffer | Uint8Array | string } params.body - The content of the object being uploaded.
 * @param {string} [params.contentType='application/octet-stream'] - The MIME type of the object being uploaded. Defaults to 'application/octet-stream' if not specified.
 * @returns {Promise<void>} A promise that resolves when the object has been successfully uploaded to S3.
 * @throws Will throw an error if the upload to S3 fails.
 */
export async function uploadToS3({
	bucketName,
	key,
	body,
	contentType = 'application/octet-stream',
}: S3UploadParams): Promise<void> {
	const params: PutObjectCommandInput = {
		Bucket: bucketName,
		Key: key,
		Body: body,
		ContentType: contentType,
	};

	const command = new PutObjectCommand(params);

	try {
		await s3Client.send(command);
		console.log(`Successfully uploaded object to S3: ${bucketName}/${key}`);
	} catch (error) {
		console.error('Error uploading to S3:', error);
		throw error;
	}
}

/**
 * Fetches an object from an S3 bucket and parses it based on the specified response type.
 *
 * @template T - The expected type of the parsed response.
 * @param {Object} params - The parameters for fetching the object.
 * @param {string} params.bucketName - The name of the S3 bucket.
 * @param {string} params.key - The key of the object in the S3 bucket.
 * @param {'json' | 'text' | 'binary'} [params.responseType='json'] - The type to which the response should be parsed.
 * @returns {Promise<T>} A promise that resolves to the parsed response.
 * @throws Will throw an error if fetching from S3 or parsing the response fails.
 */
export async function fetchFromS3<T>({
	bucketName,
	key,
	responseType = 'json',
}: S3FetchParams): Promise<T> {
	const command = new GetObjectCommand({ Bucket: bucketName, Key: key });

	try {
		const response = await s3Client.send(command);
		const stream = response.Body as Readable;

		return new Promise<T>((resolve, reject) => {
			const chunks: Buffer[] = [];
			stream.on('data', (chunk: Buffer) => chunks.push(chunk));
			stream.on('end', () => {
				const data = Buffer.concat(chunks);
				if (responseType === 'json') {
					try {
						resolve(JSON.parse(data.toString('utf-8')) as T);
					} catch (error) {
						console.error('Error parsing JSON:', error);
						reject(new Error('Failed to parse JSON from S3 object'));
					}
				} else if (responseType === 'text') {
					resolve(data.toString('utf-8') as unknown as T);
				} else if (responseType === 'binary') {
					resolve(data as unknown as T);
				}
			});
			stream.on('error', (error) => {
				console.error('Error reading stream:', error);
				reject(error);
			});
		});
	} catch (error) {
		console.error('Error fetching from S3:', error);
		throw error;
	}
}
