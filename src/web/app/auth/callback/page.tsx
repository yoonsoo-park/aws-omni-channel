'use client';

import { useEffect } from 'react';
import { Auth } from 'aws-amplify';
import { useRouter } from 'next/navigation';
import { useAmplifyConfigured } from '@/components/AmplifyConfigProvider';

export default function Callback() {
	const router = useRouter();
	const isConfigured = useAmplifyConfigured();

	useEffect(() => {
		if (isConfigured) {
			handleCallback();
		}
	}, [isConfigured]);

	async function handleCallback() {
		try {
			await Auth.currentAuthenticatedUser();
			router.push('/dashboard');
		} catch (error) {
			console.error('Authentication error:', error);
			router.push('/auth/signin');
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center">
			<div className="text-center">
				<h2 className="text-xl font-semibold">Completing sign in...</h2>
			</div>
		</div>
	);
}
