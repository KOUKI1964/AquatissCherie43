import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export function FeaturedCollections() {
  const collections = [
    {
      id: 1,
      name: 'Collection Printemps',
      description: 'Des pièces légères et colorées pour accueillir les beaux jours',
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      link: '/nouveautes'
    },
    {
      id: 2,
      name: 'Essentiels du Quotidien',
      description: 'Des basiques intemporels pour un style effortless',
      image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80',
      link: '/categorie/essentiels'
    }
  ];

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold text-gray-900">Collections en Vedette</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            Découvrez nos collections soigneusement sélectionnées pour vous inspirer
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {collections.map((collection) => (
            <div key={collection.id} className="relative overflow-hidden group rounded-lg">
              <div className="aspect-w-16 aspect-h-9 md:aspect-h-7">
                <img 
                  src={collection.image} 
                  alt={collection.name} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-8">
                <h3 className="text-2xl font-serif font-bold text-white">{collection.name}</h3>
                <p className="text-white/80 mt-2 max-w-md">{collection.description}</p>
                <Link 
                  to={collection.link}
                  className="mt-4 inline-flex items-center text-white border-b border-white/30 pb-1 hover:border-white transition-colors"
                >
                  Découvrir la collection <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}