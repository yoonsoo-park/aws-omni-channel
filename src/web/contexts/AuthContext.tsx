'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Auth, Hub } from 'aws-amplify';
import { CognitoUser } from '@aws-amplify/auth';
import { useAmplifyConfigured } from '@/components/AmplifyConfigProvider';

interface AuthContextType {
	user: CognitoUser | null;
	loading: boolean;
	signIn: () => Promise<void>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	loading: true,
	signIn: async () => {},
	signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
	const [user, setUser] = useState<CognitoUser | null>(null);
	const [loading, setLoading] = useState(true);
	const isConfigured = useAmplifyConfigured();

	useEffect(() => {
		if (isConfigured) {
			checkUser();
			setupAuthListener();
		}
	}, [isConfigured]);

	async function checkUser() {
		try {
			const currentUser = await Auth.currentAuthenticatedUser();
			setUser(currentUser);
		} catch (error) {
			setUser(null);
		} finally {
			setLoading(false);
		}
	}

	function setupAuthListener() {
		Hub.listen('auth', ({ payload: { event } }) => {
			switch (event) {
				case 'signIn':
					checkUser();
					break;
				case 'signOut':
					setUser(null);
					break;
			}
		});
	}

	async function signIn() {
		await Auth.federatedSignIn();
	}

	async function signOut() {
		await Auth.signOut();
	}

	return (
		<AuthContext.Provider value={{ user, loading, signIn, signOut }}>
			{children}
		</AuthContext.Provider>
	);
}

export const useAuth = () => useContext(AuthContext);
