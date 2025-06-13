import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User, ArrowLeft, Copy, Check, AlertCircle, Phone } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '../lib/supabase';

const signupSchema = z.object({
  email: z.string().email('Email invalide'),
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().optional(),
  phone: z.string().min(10, 'Le numéro de téléphone doit contenir au moins 10 chiffres'),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
    .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

interface SignupForm {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface ValidationError {
  field: keyof SignupForm;
  message: string;
}

export function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SignupForm>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => prev.filter(error => error.field !== name as keyof SignupForm));
    setGeneralError(null);
  };

  const validateForm = (): boolean => {
    try {
      signupSchema.parse(form);
      setErrors([]);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        setErrors(
          error.errors.map(err => ({
            field: err.path[0] as keyof SignupForm,
            message: err.message,
          }))
        );
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // First check if email exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', form.email)
        .maybeSingle();

      if (existingUser) {
        setErrors([{
          field: 'email',
          message: 'Cette adresse email est déjà utilisée'
        }]);
        return;
      }

      // Create the user
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.firstName,
            last_name: form.lastName || null,
            phone: form.phone
          }
        }
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // Wait for the trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get the user identifier
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('user_identifier')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Erreur lors de la récupération de l\'identifiant:', profileError);
        throw new Error('Erreur lors de la récupération de l\'identifiant');
      }

      setUserId(profileData.user_identifier);
      setShowSuccess(true);
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.message.includes('User already registered')) {
        setErrors([{
          field: 'email',
          message: 'Cette adresse email est déjà utilisée'
        }]);
      } else {
        setGeneralError('Une erreur est survenue lors de la création du compte. Veuillez réessayer.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getFieldError = (fieldName: keyof SignupForm) => {
    return errors.find(error => error.field === fieldName)?.message;
  };

  const handleCopyId = async () => {
    if (userId) {
      try {
        await navigator.clipboard.writeText(userId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Erreur lors de la copie:', err);
      }
    }
  };

  const handleContinue = () => {
    navigate('/connexion', {
      state: {
        message: 'Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.'
      }
    });
  };

  if (showSuccess && userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Compte créé avec succès !
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Voici votre identifiant unique. Conservez-le précieusement.
              </p>
              <div className="flex items-center justify-center space-x-2 mb-8">
                <div className="bg-gray-100 px-4 py-2 rounded-md font-mono text-lg">
                  {userId}
                </div>
                <button
                  onClick={handleCopyId}
                  className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none"
                  title="Copier l'identifiant"
                >
                  {copied ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>
              </div>
              <button
                onClick={handleContinue}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
              >
                Continuer vers la connexion
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-serif font-bold text-gray-900">
          Créer un compte
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Rejoignez Aquatiss Chérie pour découvrir notre collection
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {generalError && (
            <div className="mb-4 rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{generalError}</p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="firstName"
                className="block text-sm font-medium text-gray-700"
              >
                Prénom
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    getFieldError('firstName')
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-[#8B1F38] focus:border-[#8B1F38]'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm`}
                  value={form.firstName}
                  onChange={handleInputChange}
                  placeholder="Votre prénom"
                />
              </div>
              {getFieldError('firstName') && (
                <p className="mt-2 text-sm text-red-600">{getFieldError('firstName')}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="block text-sm font-medium text-gray-700"
              >
                Nom (facultatif)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] sm:text-sm"
                  value={form.lastName}
                  onChange={handleInputChange}
                  placeholder="Votre nom"
                />
              </div>
            </div>

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
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Téléphone
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  className={`block w-full pl-10 pr-3 py-2 border ${
                    getFieldError('phone')
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-[#8B1F38] focus:border-[#8B1F38]'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm`}
                  value={form.phone}
                  onChange={handleInputChange}
                  placeholder="06 12 34 56 78"
                />
              </div>
              {getFieldError('phone') && (
                <p className="mt-2 text-sm text-red-600">{getFieldError('phone')}</p>
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
                  required
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
                <p className="mt-2 text-sm text-red-600">{getFieldError('password')}</p>
              )}
              <div className="mt-2">
                <ul className="text-xs text-gray-500 space-y-1">
                  <li className={`flex items-center ${form.password.length >= 8 ? 'text-green-600' : ''}`}>
                    • Au moins 8 caractères
                  </li>
                  <li className={`flex items-center ${/[A-Z]/.test(form.password) ? 'text-green-600' : ''}`}>
                    • Une lettre majuscule
                  </li>
                  <li className={`flex items-center ${/[a-z]/.test(form.password) ? 'text-green-600' : ''}`}>
                    • Une lettre minuscule
                  </li>
                  <li className={`flex items-center ${/[0-9]/.test(form.password) ? 'text-green-600' : ''}`}>
                    • Un chiffre
                  </li>
                  <li className={`flex items-center ${/[^A-Za-z0-9]/.test(form.password) ? 'text-green-600' : ''}`}>
                    • Un caractère spécial
                  </li>
                </ul>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700"
              >
                Confirmer le mot de passe
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className={`block w-full pl-10 pr-10 py-2 border ${
                    getFieldError('confirmPassword')
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 focus:ring-[#8B1F38] focus:border-[#8B1F38]'
                  } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 sm:text-sm`}
                  value={form.confirmPassword}
                  onChange={handleInputChange}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              {getFieldError('confirmPassword') && (
                <p className="mt-2 text-sm text-red-600">
                  {getFieldError('confirmPassword')}
                </p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#8B1F38] hover:bg-[#7A1B31] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38] ${
                  isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Création du compte...' : 'Créer un compte'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Déjà inscrit ?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/connexion"
                className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B1F38]"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}