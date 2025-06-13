import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, AlertCircle, Check } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { encryptPassword, decryptPassword } from '../lib/crypto';

// Schema for form validation
const loginSchema = z.object({
  email: z.string().email('Email invalide').trim(),
  password: z.string().min(1, 'Le mot de passe est requis').trim(),
});

interface LoginForm {
  email: string;
  password: string;
}

interface ValidationError {
  field: keyof LoginForm;
  message: string;
}

interface LocationState {
  message?: string;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(state?.message || null);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockExpiry, setBlockExpiry] = useState<Date | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const MAX_LOGIN_ATTEMPTS = 8;
  const BLOCK_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds

  useEffect(() => {
    const checkAuthState = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        navigate('/');
        return;
      }

      // Check if user is blocked
      const blockedUntil = localStorage.getItem('loginBlockedUntil');
      if (blockedUntil) {
        const expiryDate = new Date(blockedUntil);
        if (expiryDate > new Date()) {
          setIsBlocked(true);
          setBlockExpiry(expiryDate);
        } else {
          localStorage.removeItem('loginBlockedUntil');
          resetLoginAttempts();
        }
      }

      // Load saved credentials if they exist
      const savedEmail = localStorage.getItem('userEmail');
      const savedPassword = localStorage.getItem('encryptedPassword');
      if (savedEmail && savedPassword) {
        try {
          const decryptedPassword = decryptPassword(savedPassword);
          setForm({
            email: savedEmail,
            password: decryptedPassword
          });
          setRememberMe(true);
        } catch (error) {
          console.error('Error decrypting password:', error);
          // Clear invalid stored credentials
          localStorage.removeItem('userEmail');
          localStorage.removeItem('encryptedPassword');
        }
      }
    };

    checkAuthState();

    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [navigate, successMessage]);

  useEffect(() => {
    let interval: number;
    if (isBlocked && blockExpiry) {
      interval = setInterval(() => {
        const now = new Date();
        if (blockExpiry <= now) {
          setIsBlocked(false);
          setBlockExpiry(null);
          localStorage.removeItem('loginBlockedUntil');
          resetLoginAttempts();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBlocked, blockExpiry]);

  const resetLoginAttempts = () => {
    setLoginAttempts(0);
    setIsBlocked(false);
    localStorage.removeItem('loginAttempts');
  };

  const blockLogin = () => {
    const expiryDate = new Date(Date.now() + BLOCK_DURATION);
    setIsBlocked(true);
    setBlockExpiry(expiryDate);
    localStorage.setItem('loginBlockedUntil', expiryDate.toISOString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value.trim() }));
    setErrors(prev => prev.filter(error => error.field !== name as keyof LoginForm));
  };

  const validateForm = (): boolean => {
    // Skip password validation if rememberMe is true and we have saved credentials
    if (rememberMe && localStorage.getItem('userEmail') === form.email) {
      try {
        z.object({ email: z.string().email('Email invalide') }).parse({ email: form.email });
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          setErrors(
            error.errors.map(err => ({
              field: err.path[0] as keyof LoginForm,
              message: err.message,
            }))
          );
        }
        return false;
      }
    }

    // Full validation for non-rememberMe case
    try {
      loginSchema.parse(form);
      setErrors([]);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(
          error.errors.map(err => ({
            field: err.path[0] as keyof LoginForm,
            message: err.message,
          }))
        );
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isBlocked) {
      return;
    }

    // Additional validation for non-rememberMe case
    if (!rememberMe && !form.password) {
      setErrors([{
        field: 'password',
        message: 'Le mot de passe est requis quand "Se souvenir de moi" est désactivé'
      }]);
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: form.email.toLowerCase(),
        password: form.password
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          const newAttempts = loginAttempts + 1;
          setLoginAttempts(newAttempts);
          localStorage.setItem('loginAttempts', newAttempts.toString());

          if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            blockLogin();
            setErrors([
              {
                field: 'password',
                message: 'Trop de tentatives échouées. Compte bloqué pendant 30 minutes.',
              },
            ]);
          } else {
            setErrors([
              {
                field: 'password',
                message: 'Email ou mot de passe incorrect',
              },
            ]);
          }
          return;
        }
        throw error;
      }

      if (data.user) {
        // Reset login attempts on successful login
        resetLoginAttempts();

        // Save credentials if remember me is checked
        if (rememberMe) {
          localStorage.setItem('userEmail', form.email.toLowerCase());
          const encryptedPassword = encryptPassword(form.password);
          localStorage.setItem('encryptedPassword', encryptedPassword);
        } else {
          localStorage.removeItem('userEmail');
          localStorage.removeItem('encryptedPassword');
        }

        // Update profile with last login
        await supabase
          .from('profiles')
          .update({
            last_login: new Date().toISOString(),
            login_attempts: 0,
            blocked_until: null
          })
          .eq('id', data.user.id);

        // Redirect to home page
        navigate('/');
      }
    } catch (error: any) {
      setErrors([
        {
          field: 'password',
          message: 'Une erreur est survenue lors de la connexion',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getFieldError = (fieldName: keyof LoginForm) => {
    return errors.find(error => error.field === fieldName)?.message;
  };

  const getRemainingBlockTime = () => {
    if (!blockExpiry) return '';
    const now = new Date();
    const diff = blockExpiry.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-serif font-bold text-gray-900">
          Connexion
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {successMessage && (
            <div className="mb-4 rounded-md bg-green-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Check className="h-5 w-5 text-green-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-800">{successMessage}</p>
                </div>
              </div>
            </div>
          )}

          {isBlocked ? (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Compte temporairement bloqué
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>
                      Trop de tentatives de connexion échouées. Veuillez réessayer dans{' '}
                      {getRemainingBlockTime()}.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit} noValidate>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={`block w-full pl-10 pr-3 py-2 border ${
                      getFieldError('email')
                        ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-[#8B1F38] focus:border-[#8B1F38]'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm`}
                    value={form.email}
                    onChange={handleInputChange}
                    placeholder="votre@email.com"
                  />
                </div>
                {getFieldError('email') && (
                  <p className="mt-2 text-sm text-red-600">{getFieldError('email')}</p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Mot de passe
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required={!rememberMe}
                    className={`block w-full pl-10 pr-10 py-2 border ${
                      getFieldError('password')
                        ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                        : 'border-gray-300 focus:ring-[#8B1F38] focus:border-[#8B1F38]'
                    } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm`}
                    value={form.password}
                    onChange={handleInputChange}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-gray-500 focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
                {getFieldError('password') && (
                  <p className="mt-2 text-sm text-red-600">
                    {getFieldError('password')}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 text-[#8B1F38] focus:ring-[#8B1F38] border-gray-300 rounded"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Se souvenir de moi
                  </label>
                </div>

                <div className="text-sm">
                  <Link
                    to="/mot-de-passe-oublie"
                    className="font-medium text-[#8B1F38] hover:text-[#7A1B31]"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? 'Connexion...' : 'Se connecter'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Pas encore de compte ?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/inscription"
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}