import React, { useState } from 'react';
import { Mail, Check, AlertCircle } from 'lucide-react';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Veuillez entrer une adresse email valide');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Success
      setSuccess(true);
      setEmail('');
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
    } catch (err) {
      setError('Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="py-16 bg-[#8B1F38]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-serif font-bold text-white">Restez informée</h2>
          <p className="mt-4 text-lg text-white/80">
            Inscrivez-vous à notre newsletter pour recevoir nos dernières nouveautés, 
            offres exclusives et conseils mode
          </p>
          
          <form onSubmit={handleSubmit} className="mt-8">
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <div className="relative flex-grow">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Votre adresse email"
                  className="block w-full pl-10 pr-3 py-3 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-white focus:border-white sm:text-sm"
                  disabled={isSubmitting || success}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting || success}
                className="bg-white text-[#8B1F38] px-6 py-3 rounded-md font-medium hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#8B1F38] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Inscription...' : success ? 'Inscrit(e) !' : 'S\'inscrire'}
              </button>
            </div>
            
            {error && (
              <div className="mt-3 flex items-center justify-center text-white">
                <AlertCircle className="h-4 w-4 mr-1" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mt-3 flex items-center justify-center text-white">
                <Check className="h-4 w-4 mr-1" />
                <p className="text-sm">Merci pour votre inscription !</p>
              </div>
            )}
          </form>
          
          <p className="mt-4 text-xs text-white/60">
            En vous inscrivant, vous acceptez de recevoir nos emails et confirmez avoir lu notre 
            <a href="/confidentialite" className="underline hover:text-white"> politique de confidentialité</a>.
          </p>
        </div>
      </div>
    </section>
  );
}