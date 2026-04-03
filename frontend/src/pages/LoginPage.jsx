import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      if (data.user) {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-on-background)] flex items-center justify-center p-6 relative overflow-hidden">
      {}
      <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-[var(--color-secondary-dim)] rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-[var(--color-primary-dim)] rounded-full mix-blend-screen filter blur-[120px] opacity-10 pointer-events-none"></div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-[var(--color-surface-container)] border border-[var(--color-outline-variant)] rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">

          {}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--color-secondary)] via-[var(--color-primary)] to-[var(--color-secondary-dim)] opacity-40"></div>

          <div className="text-center mb-8 mt-2">
            <h1 className="font-headline text-3xl md:text-4xl font-bold mb-3 tracking-tight text-[var(--color-on-surface)]">
              Welcome back
            </h1>
            <p className="text-[var(--color-on-surface-variant)] text-sm md:text-base font-medium">
              Log in to your Episteme account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-error/10 border border-error/20 text-error text-xs p-3 rounded-xl flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                {error}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[13px] font-semibold text-[var(--color-on-surface-variant)] ml-1 uppercase tracking-wider">Email Address</label>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-outline)] text-[20px] transition-colors duration-300 group-focus-within:text-[var(--color-primary)]">mail</span>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="student@university.edu"
                  required
                  className="w-full bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)] rounded-xl py-3 pl-11 pr-4 text-[var(--color-on-surface)] placeholder-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all duration-300 shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                 <label className="text-[13px] font-semibold text-[var(--color-on-surface-variant)] uppercase tracking-wider">Password</label>
                 <span className="text-xs text-[var(--color-outline)] hover:text-[var(--color-primary)] transition-colors cursor-pointer mr-1">Forgot?</span>
              </div>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-outline)] text-[20px] transition-colors duration-300 group-focus-within:text-[var(--color-primary)]">lock</span>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[var(--color-surface-container-lowest)] border border-[var(--color-outline-variant)] rounded-xl py-3 pl-11 pr-4 text-[var(--color-on-surface)] placeholder-[var(--color-outline)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all duration-300 shadow-inner"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-primary)] text-[var(--color-on-primary)] font-bold rounded-xl py-3.5 mt-4 shadow-[0_0_15px_rgba(255,143,111,0.15)] hover:shadow-[0_0_25px_rgba(255,143,111,0.3)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 mr-3 text-[var(--color-on-primary)]" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
              ) : (
                <>
                  Sign In
                  <span className="material-symbols-outlined text-[20px]">login</span>
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--color-outline-variant)]/50 text-center text-sm text-[var(--color-on-surface-variant)]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[var(--color-secondary)] font-semibold hover:text-[var(--color-secondary-fixed)] hover:underline decoration-2 underline-offset-4 transition-all">
              Create one
            </Link>
          </div>

        </div>

        {}
        <div className="mt-6 flex justify-center items-center gap-4 text-xs text-[var(--color-outline)] font-medium">
            <Link to="/" className="hover:text-[var(--color-on-surface-variant)] transition-colors cursor-pointer flex items-center gap-1">
               <span className="material-symbols-outlined text-[14px]">arrow_back</span>
               Back to Home
            </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
