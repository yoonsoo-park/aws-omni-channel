'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
	const { signOut, user } = useAuth();

	return (
		<ProtectedRoute>
			<div className="min-h-screen p-8">
				<div className="max-w-4xl mx-auto">
					<div className="flex justify-between items-center mb-8">
						<h1 className="text-2xl font-bold">Dashboard</h1>
						<button
							onClick={signOut}
							className="px-4 py-2 text-sm text-white bg-red-600 rounded hover:bg-red-700"
						>
							Sign Out
						</button>
					</div>
					<div className="bg-white shadow rounded-lg p-6">
						<h2 className="text-lg font-semibold mb-4">
							Welcome, {user?.getUsername()}
						</h2>
						<p className="text-gray-600">
							You are now signed in to the OmniChannel Platform.
						</p>
					</div>
				</div>
			</div>
		</ProtectedRoute>
	);
}
