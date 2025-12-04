import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authService';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await loginUser(email, password);
            navigate('/');
        } catch (err) {
            setError('Failed to login. Please check your credentials.');
            console.error(err);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-app-bg flex items-center justify-center p-4">
            <div className="bg-sidebar-bg p-8 rounded-lg shadow-lg w-full max-w-md border border-gray-700">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-gray-100 mb-2">Chat App</h1>
                    <p className="text-gray-400">Login to your account</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500 text-red-500 p-3 rounded mb-4 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-gray-400 text-sm font-medium mb-2">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full bg-chat-bg border border-gray-600 text-gray-100 rounded px-3 py-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm font-medium mb-2">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full bg-chat-bg border border-gray-600 text-gray-100 rounded px-3 py-2 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-accent hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded transition duration-200 disabled:opacity-50"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div className="mt-6 text-center text-gray-400 text-sm">
                    Don't have an account?{' '}
                    <Link to="/register" className="text-accent hover:underline">
                        Register
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
