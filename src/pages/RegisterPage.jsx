import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/authService';

const RegisterPage = () => {
    const [name, setName] = useState('');
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
            await registerUser(email, password, name);
            navigate('/');
        } catch (err) {
            setError('Failed to create account. ' + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Gradient/Blur Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="glass-panel p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/10 relative z-10 animate-fade-in-up">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Create Account</h1>
                    <p className="text-text-secondary">Join Chat App today</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl mb-6 text-sm flex items-center justify-center">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1">
                        <label className="block text-text-secondary text-xs font-medium uppercase tracking-wider ml-1">Display Name</label>
                        <input
                            type="text"
                            required
                            className="w-full glass-input rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-accent/50 transition-all duration-200"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-text-secondary text-xs font-medium uppercase tracking-wider ml-1">Email</label>
                        <input
                            type="email"
                            required
                            className="w-full glass-input rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-accent/50 transition-all duration-200"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="block text-text-secondary text-xs font-medium uppercase tracking-wider ml-1">Password</label>
                        <input
                            type="password"
                            required
                            minLength={6}
                            className="w-full glass-input rounded-xl px-4 py-3 text-text-primary focus:ring-2 focus:ring-accent/50 transition-all duration-200"
                            placeholder="Choose a password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-accent hover:bg-accent/90 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-accent/25 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                    >
                        {loading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Creating Account...</span>
                            </div>
                        ) : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-8 text-center text-text-secondary text-sm">
                    Already have an account?{' '}
                    <Link to="/login" className="text-accent hover:text-accent/80 font-medium hover:underline transition-colors">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
