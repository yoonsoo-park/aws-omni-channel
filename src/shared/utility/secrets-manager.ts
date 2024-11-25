import { assumeRole } from './aws-utils';
import { SecretsManager, Credentials } from 'aws-sdk';

export class SpSecretsManager {
	private readonly devopsAccountId: string;
	private readonly roleName: string;
	private credentials?: Credentials;

	constructor() {
		this.devopsAccountId = '726849041453';
		this.roleName = 'EnvProvCrossAccountRole';
	}

	/**
	 * Retrieves AWS credentials by assuming a specified role.
	 *
	 * @returns A `Credentials` object containing access key, secret key, and session token.
	 * @throws Error if the role assumption fails or if credentials cannot be obtained.
	 */
	private async getCredentials(): Promise<Credentials> {
		if (!this.credentials) {
			const assumedRole = await assumeRole(this.devopsAccountId, this.roleName);
			this.credentials = new Credentials({
				accessKeyId: assumedRole.AccessKeyId,
				secretAccessKey: assumedRole.SecretAccessKey,
				sessionToken: assumedRole.SessionToken,
			});
		}
		return this.credentials;
	}

	/**
	 * Retrieves a secret value from AWS Secrets Manager using role credentials.
	 *
	 * @param secretName - The name of the secret.
	 * @returns The parsed secret value (if available).
	 * @throws Error if the secret retrieval fails or if the secret has no value.
	 */
	public async getSecret(secretName: string): Promise<any> {
		try {
			const credentials = await this.getCredentials();
			const secretsmanagerWithRole = new SecretsManager({ credentials });
			const secretId = `arn:aws:secretsmanager:us-east-1:${this.devopsAccountId}:secret:${secretName}`;
			const secretValue = await secretsmanagerWithRole
				.getSecretValue({ SecretId: secretId })
				.promise();

			if (secretValue.SecretString) {
				return JSON.parse(secretValue.SecretString);
			} else if (secretValue.SecretBinary) {
				const secretObject = JSON.parse(
					Buffer.from(secretValue.SecretBinary as Uint8Array).toString('utf-8'),
				);
				return secretObject;
			} else {
				throw new Error(`Secret ${secretName} has no value`);
			}
		} catch (err) {
			console.error(err);
			throw err;
		}
	}
}
