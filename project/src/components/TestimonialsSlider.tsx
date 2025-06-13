import React, { useState, useEffect } from 'react';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

interface Testimonial {
  id: number;
  name: string;
  avatar: string;
  rating: number;
  text: string;
  product: string;
}

export function TestimonialsSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const testimonials: Testimonial[] = [
    {
      id: 1,
      name: 'Sophie L.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
      rating: 5,
      text: "J'adore ma nouvelle robe ! La qualité est exceptionnelle et la coupe est parfaite. Je reçois des compliments à chaque fois que je la porte.",
      product: 'Robe Élégance'
    },
    {
      id: 2,
      name: 'Marie T.',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
      rating: 5,
      text: "Le sac que j'ai commandé est encore plus beau en vrai que sur les photos. La livraison a été rapide et l'emballage très soigné.",
      product: 'Sac Élégance Parisienne'
    },
    {
      id: 3,
      name: 'Camille D.',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80',
      rating: 4,
      text: "J'ai utilisé une clé de réduction partagée par une amie et j'ai pu économiser 20% sur ma commande. Le processus était simple et rapide !",
      product: 'Ensemble Casual Chic'
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      goToNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  const goToPrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? testimonials.length - 1 : prevIndex - 1
    );
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goToNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prevIndex) => 
      prevIndex === testimonials.length - 1 ? 0 : prevIndex + 1
    );
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goToIndex = (index: number) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-serif font-bold text-gray-900">Ce que nos clientes disent</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            Découvrez les expériences de nos clientes satisfaites
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {testimonials.map((testimonial) => (
                <div 
                  key={testimonial.id} 
                  className="w-full flex-shrink-0 px-4"
                >
                  <div className="bg-gray-50 rounded-xl p-8 shadow-sm">
                    <div className="flex items-center mb-6">
                      <img 
                        src={testimonial.avatar} 
                        alt={testimonial.name} 
                        className="h-12 w-12 rounded-full object-cover mr-4"
                      />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{testimonial.name}</h3>
                        <div className="flex items-center mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`h-4 w-4 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-gray-600 italic mb-4">"{testimonial.text}"</p>
                    <p className="text-sm text-gray-500">À propos de: <span className="font-medium">{testimonial.product}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation buttons */}
          <button 
            onClick={goToPrev}
            className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#8B1F38] focus:ring-offset-2 md:-translate-x-full"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <button 
            onClick={goToNext}
            className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#8B1F38] focus:ring-offset-2 md:translate-x-full"
          >
            <ChevronRight className="h-6 w-6 text-gray-600" />
          </button>

          {/* Pagination dots */}
          <div className="flex justify-center mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => goToIndex(i)}
                className={`mx-1 h-2 w-2 rounded-full ${
                  currentIndex === i ? 'bg-[#8B1F38]' : 'bg-gray-300'
                }`}
                aria-label={`Témoignage ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}