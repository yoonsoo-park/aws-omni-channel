import { Context } from 'aws-lambda';
import { ALambdaHandler } from '@ncino/aws-sdk';
import { ResultData } from '../../shared/types/omni-channel-types';
import { uploadToS3, fetchFromS3 } from '../../shared/utility/s3-utils';

export class Handler extends ALambdaHandler {
	public async main(input: any, context: Context): Promise<any> {
		try {
			if (!process.env.BUCKET_NAME) {
				throw new Error('BUCKET_NAME environment variable not set.');
			}

			const combinedResult: ResultData = {
				repo_version_list: [],
				new_sobjects: [],
				added_fields: {},
				deleted_fields: {},
				compared_fields: [],
				previous_version_fields: {},
				new_version_fields: {},
			};

			const bucketName = process.env.BUCKET_NAME!;
			let executionId: string = '';
			let outputFileName: string = '';

			// Retrieve each S3 object from the event
			for (const item of input) {
				if (executionId === '') {
					executionId = item.execution_id;
				}
				if (outputFileName === '') {
					outputFileName = item.file_name;
				}
				const resultData: ResultData = await fetchFromS3<ResultData>({
					bucketName: item.s3_bucket,
					key: item.s3_key,
				});
				console.log('retrieved resultData: ', resultData);

				combinedResult.repo_version_list.push(...resultData.repo_version_list);
				combinedResult.new_sobjects.push(...resultData.new_sobjects);

				// Combine added_fields
				for (const [key, value] of Object.entries(resultData.added_fields)) {
					if (combinedResult.added_fields[key]) {
						combinedResult.added_fields[key].push(...value);
					} else {
						combinedResult.added_fields[key] = value;
					}
				}

				// Combine deleted_fields
				for (const [key, value] of Object.entries(resultData.deleted_fields)) {
					if (combinedResult.deleted_fields[key]) {
						combinedResult.deleted_fields[key].push(...value);
					} else {
						combinedResult.deleted_fields[key] = value;
					}
				}

				// Combine compared_fields
				combinedResult.compared_fields.push(...resultData.compared_fields);

				// Combine previous_version_fields
				for (const [key, value] of Object.entries(resultData.previous_version_fields)) {
					if (combinedResult.previous_version_fields[key]) {
						combinedResult.previous_version_fields[key].push(...value);
					} else {
						combinedResult.previous_version_fields[key] = value;
					}
				}

				// Combine new_version_fields
				for (const [key, value] of Object.entries(resultData.new_version_fields)) {
					if (combinedResult.new_version_fields[key]) {
						combinedResult.new_version_fields[key].push(...value);
					} else {
						combinedResult.new_version_fields[key] = value;
					}
				}
			}

			const combinedKey = `${executionId}/data-model-diff/${outputFileName}.json`;
			await uploadToS3({
				bucketName,
				key: combinedKey,
				body: JSON.stringify(combinedResult),
				contentType: 'application/json',
			});

			return { s3_bucket: bucketName, s3_key: combinedKey };
		} catch (error) {
			this.log(error);
			throw error;
		}
	}
}

export const handler = new Handler();
export const main = handler.execute.bind(handler);
