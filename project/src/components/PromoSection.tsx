import React from 'react';
import { Link } from 'react-router-dom';
import { Gift, Key, ArrowRight, Sparkles } from 'lucide-react';

export function PromoSection() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold text-gray-900">Nos Avantages Exclusifs</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            Découvrez nos offres spéciales et économisez sur vos achats préférés
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Discount Keys Card */}
          <div className="bg-white rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <div className="h-64 bg-gradient-to-r from-[#8B1F38] to-[#7A1B31] relative">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 left-4 w-20 h-20 rounded-full bg-white/20"></div>
                <div className="absolute bottom-12 right-8 w-32 h-32 rounded-full bg-white/10"></div>
                <div className="absolute top-1/2 left-1/3 w-16 h-16 rounded-full bg-white/15"></div>
              </div>
              <div className="relative h-full flex items-center justify-center">
                <Key className="h-24 w-24 text-white/90" />
              </div>
            </div>
            <div className="p-8">
              <div className="flex items-center mb-4">
                <Sparkles className="h-5 w-5 text-[#8B1F38] mr-2" />
                <h3 className="text-xl font-bold text-gray-900">Clés de Réduction</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Partagez votre code unique avec vos amis et bénéficiez de réductions allant jusqu'à 20% sur vos articles préférés. Plus vous partagez, plus vous économisez !
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Jusqu'à 20% de réduction
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Partageable
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Sans minimum d'achat
                </div>
              </div>
              <Link 
                to="/profil" 
                className="inline-flex items-center text-[#8B1F38] font-medium hover:text-[#7A1B31]"
              >
                Activer mes clés <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Gift Cards Card */}
          <div className="bg-white rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <div className="h-64 bg-gradient-to-r from-[#333333] to-[#111111] relative">
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 right-4 w-20 h-20 rounded-full bg-white/20"></div>
                <div className="absolute bottom-12 left-8 w-32 h-32 rounded-full bg-white/10"></div>
                <div className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full bg-white/15"></div>
              </div>
              <div className="relative h-full flex items-center justify-center">
                <Gift className="h-24 w-24 text-white/90" />
              </div>
            </div>
            <div className="p-8">
              <div className="flex items-center mb-4">
                <Sparkles className="h-5 w-5 text-[#8B1F38] mr-2" />
                <h3 className="text-xl font-bold text-gray-900">Chèques Cadeaux</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Offrez le cadeau parfait avec nos chèques cadeaux personnalisables. Choisissez le montant, ajoutez un message personnel et faites plaisir à vos proches.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Montants flexibles
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Personnalisable
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Valable 1 an
                </div>
              </div>
              <Link 
                to="/cheque-cadeau" 
                className="inline-flex items-center text-[#8B1F38] font-medium hover:text-[#7A1B31]"
              >
                Offrir un chèque cadeau <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}