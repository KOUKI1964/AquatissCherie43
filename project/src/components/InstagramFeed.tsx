import React from 'react';
import { Instagram } from 'lucide-react';

export function InstagramFeed() {
  // Simulated Instagram posts
  const instagramPosts = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      likes: 124,
      comments: 8
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      likes: 98,
      comments: 5
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      likes: 156,
      comments: 12
    },
    {
      id: 4,
      image: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      likes: 87,
      comments: 4
    },
    {
      id: 5,
      image: 'https://images.unsplash.com/photo-1581044777550-4cfa60707c03?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      likes: 142,
      comments: 9
    },
    {
      id: 6,
      image: 'https://images.unsplash.com/photo-1475180098004-ca77a66827be?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
      likes: 113,
      comments: 7
    }
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Instagram className="h-6 w-6 text-[#8B1F38] mr-2" />
            <h2 className="text-3xl font-serif font-bold text-gray-900">Suivez-nous sur Instagram</h2>
          </div>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            Rejoignez notre communauté et partagez votre style avec #AquatissCherie
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {instagramPosts.map((post) => (
            <a 
              key={post.id} 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group relative overflow-hidden"
            >
              <div className="aspect-square overflow-hidden">
                <img 
                  src={post.image} 
                  alt="Instagram post" 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="text-white text-center">
                  <p className="text-sm font-medium">{post.likes} ❤️</p>
                  <p className="text-sm font-medium">{post.comments} 💬</p>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className="text-center mt-10">
          <a 
            href="https://instagram.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center px-6 py-3 border border-[#8B1F38] text-base font-medium rounded-md text-[#8B1F38] bg-white hover:bg-[#8B1F38] hover:text-white transition-colors duration-300"
          >
            <Instagram className="h-5 w-5 mr-2" />
            Suivre @AquatissCherie
          </a>
        </div>
      </div>
    </section>
  );
}