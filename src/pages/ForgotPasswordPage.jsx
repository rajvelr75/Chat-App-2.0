import { useState } from 'react';
import { Link } from 'react-router-dom';
import { resetPassword } from '../services/authService';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            await resetPassword(email);
            setMessage('Check your email for instructions to reset your password.');
        } catch (err) {
            setError('Failed to reset password. ' + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex w-full bg-white">
            {/* Left Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-16">
                <div className="w-full max-w-md space-y-8 animate-fade-in-up">
                    <div className="text-center lg:text-left">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0C4DA2]/10 mb-6 text-[#0C4DA2]">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Forgot Password?</h1>
                        <p className="mt-2 text-gray-500">Enter your email and we'll send you a link to reset your password</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-medium text-sm">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="bg-green-50 text-green-600 p-4 rounded-xl border border-green-100 font-medium text-sm">
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-700">Email Address</label>
                            <input
                                type="email"
                                required
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#0C4DA2]/20 focus:border-[#0C4DA2] transition-all duration-200 outline-none"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#0C4DA2] hover:bg-[#0A3D80] text-white font-semibold py-4 px-4 rounded-xl transition-all duration-200 transform active:scale-[0.98] shadow-lg shadow-[#0C4DA2]/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Sending Reset Link...</span>
                                </>
                            ) : 'Reset Password'}
                        </button>
                    </form>

                    <div className="pt-4 text-center lg:text-left">
                        <Link to="/login" className="text-gray-500 hover:text-gray-900 font-medium flex items-center justify-center lg:justify-start gap-2 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back to Sign In
                        </Link>
                    </div>
                </div>
            </div>

            {/* Right Side - Visual */}
            <div className="hidden lg:flex w-1/2 bg-[#0C4DA2] relative overflow-hidden items-center justify-center p-12 text-white">
                <div className="absolute inset-0">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
                </div>
                <div className="relative z-10 max-w-lg text-center">
                    <div className="mb-8 flex justify-center">
                        <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-2xl border border-white/20">
                            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        </div>
                    </div>
                    <h2 className="text-4xl font-bold mb-6">Account Recovery</h2>
                    <p className="text-blue-100 text-lg leading-relaxed">Don't worry, it happens to the best of us. We'll help you get back into your account in no time.</p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
