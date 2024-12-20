import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { Sha256 } from '@aws-crypto/sha256-js';
import fetch from 'node-fetch';

const PRODUCT_ACCESS_QUERY = `
    query GetUserProductAccess($userId: ID!, $groups: [String!]!) {
        userProductAccess(userId: $userId, groups: $groups) {
            productId
            hasAccess
            accessLevel
            grantedAt
        }
    }
`;

const NOTIFY_CONTEXT_UPDATE = `
    mutation NotifyContextUpdate($userId: ID!, $update: ContextUpdateInput!) {
        notifyContextUpdate(userId: $userId, update: $update) {
            success
            timestamp
        }
    }
`;

export class AppSyncClient {
	private signer: SignatureV4;

	constructor(
		private apiUrl: string,
		private apiId: string,
	) {
		this.signer = new SignatureV4({
			credentials: defaultProvider(),
			region: process.env.AWS_REGION!,
			service: 'appsync',
			sha256: Sha256,
		});
	}

	async queryProductAccess(userId: string, groups: string[]) {
		const request = new HttpRequest({
			hostname: new URL(this.apiUrl).host,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				host: new URL(this.apiUrl).host,
			},
			path: '/graphql',
			body: JSON.stringify({
				query: PRODUCT_ACCESS_QUERY,
				variables: { userId, groups },
			}),
		});

		const signed = await this.signer.sign(request);
		const response = await fetch(this.apiUrl, signed);
		const data = await response.json();

		if (data.errors) {
			throw new Error(`GraphQL query failed: ${JSON.stringify(data.errors)}`);
		}

		return data.data.userProductAccess;
	}

	async notifyContextUpdate(userId: string, update: any) {
		const request = new HttpRequest({
			hostname: new URL(this.apiUrl).host,
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				host: new URL(this.apiUrl).host,
			},
			path: '/graphql',
			body: JSON.stringify({
				query: NOTIFY_CONTEXT_UPDATE,
				variables: { userId, update },
			}),
		});

		const signed = await this.signer.sign(request);
		const response = await fetch(this.apiUrl, signed);
		const data = await response.json();

		if (data.errors) {
			throw new Error(`GraphQL mutation failed: ${JSON.stringify(data.errors)}`);
		}

		return data.data.notifyContextUpdate;
	}
}
