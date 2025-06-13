import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { HomeBanner } from './components/HomeBanner';
import { BannerNotification } from './components/BannerNotification';
import { FeaturedCollections } from './components/FeaturedCollections';
import { TrendingProducts } from './components/TrendingProducts';
import { PromoSection } from './components/PromoSection';
import { InstagramFeed } from './components/InstagramFeed';
import { Newsletter } from './components/Newsletter';
import { TestimonialsSlider } from './components/TestimonialsSlider';

// Lazy load pages to reduce initial bundle size
const DressesPage = lazy(() => import('./pages/DressesPage').then(m => ({ default: m.DressesPage })));
const CartPage = lazy(() => import('./pages/CartPage').then(m => ({ default: m.CartPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const OrderConfirmationPage = lazy(() => import('./pages/OrderConfirmationPage').then(m => ({ default: m.OrderConfirmationPage })));
const GiftCardPage = lazy(() => import('./pages/GiftCardPage').then(m => ({ default: m.GiftCardPage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then(m => ({ default: m.ProductDetailPage })));
const NouveautesPage = lazy(() => import('./pages/NouveautesPage').then(m => ({ default: m.NouveautesPage })));
const CategoryPage = lazy(() => import('./pages/CategoryPage').then(m => ({ default: m.CategoryPage })));

// Group admin pages by functionality for better code splitting
const AdminAuth = {
  Login: lazy(() => import('./pages/admin/AdminLoginPage').then(m => ({ default: m.AdminLoginPage }))),
};

const AdminCore = {
  Dashboard: lazy(() => import('./pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard }))),
  Settings: lazy(() => import('./pages/admin/SettingsPage').then(m => ({ default: m.SettingsPage }))),
  Banners: lazy(() => import('./pages/admin/BannersPage').then(m => ({ default: m.BannersPage }))),
};

const AdminProducts = {
  List: lazy(() => import('./pages/admin/ProductsPage').then(m => ({ default: m.ProductsPage }))),
  New: lazy(() => import('./pages/admin/NewProductPage').then(m => ({ default: m.NewProductPage }))),
  Edit: lazy(() => import('./pages/admin/EditProductPage').then(m => ({ default: m.EditProductPage }))),
  Categories: lazy(() => import('./pages/admin/CategoriesPage').then(m => ({ default: m.CategoriesPage }))),
  MenuCategories: lazy(() => import('./pages/admin/MenuCategoriesPage').then(m => ({ default: m.MenuCategoriesPage }))),
  Media: lazy(() => import('./pages/admin/MediaLibraryPage').then(m => ({ default: m.MediaLibraryPage }))),
  Import: lazy(() => import('./pages/admin/ProductImportPage').then(m => ({ default: m.ProductImportPage }))),
};

const AdminUsers = {
  List: lazy(() => import('./pages/admin/UsersPage').then(m => ({ default: m.UsersPage }))),
  New: lazy(() => import('./pages/admin/NewUserPage').then(m => ({ default: m.NewUserPage }))),
  Edit: lazy(() => import('./pages/admin/EditUserPage').then(m => ({ default: m.EditUserPage }))),
  Roles: lazy(() => import('./pages/admin/RolesPage').then(m => ({ default: m.RolesPage }))),
  UserRoles: lazy(() => import('./pages/admin/UserRolesPage').then(m => ({ default: m.UserRolesPage }))),
};

const AdminCommerce = {
  GiftCards: lazy(() => import('./pages/admin/GiftCardsPage').then(m => ({ default: m.GiftCardsPage }))),
  ReceivedGiftCards: lazy(() => import('./pages/admin/ReceivedGiftCardsPage').then(m => ({ default: m.ReceivedGiftCardsPage }))),
  Suppliers: lazy(() => import('./pages/admin/SuppliersPage').then(m => ({ default: m.SuppliersPage }))),
  NewSupplier: lazy(() => import('./pages/admin/NewSupplierPage').then(m => ({ default: m.NewSupplierPage }))),
  EditSupplier: lazy(() => import('./pages/admin/EditSupplierPage').then(m => ({ default: m.EditSupplierPage }))),
  Orders: lazy(() => import('./pages/admin/OrdersPage').then(m => ({ default: m.OrdersPage }))),
  OrderDetail: lazy(() => import('./pages/admin/OrderDetailPage').then(m => ({ default: m.OrderDetailPage }))),
};

// Loading component
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#8B1F38]"></div>
  </div>
);

function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <HomeBanner />

      {/* Global Notification Banner */}
      <BannerNotification location="global" />

      {/* Featured Collections */}
      <FeaturedCollections />

      {/* Trending Products */}
      <TrendingProducts />

      {/* Promo Section - Discount Keys & Gift Cards */}
      <PromoSection />

      {/* Categories */}
      <div id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-8">Nos Catégories</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="relative group overflow-hidden rounded-lg">
            <img
              className="w-full h-96 object-cover transition-transform duration-500 group-hover:scale-105"
              src="https://images.unsplash.com/photo-1445205170230-053b83016050?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80"
              alt="Vêtements"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 group-hover:opacity-90"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <h3 className="text-2xl font-serif font-bold text-white">Vêtements</h3>
              <p className="text-white mt-2 opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                Découvrez notre collection de vêtements élégants et tendance
              </p>
              <button className="mt-4 px-4 py-2 bg-white text-gray-900 rounded-md opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                Découvrir →
              </button>
            </div>
          </div>
          <div className="relative group overflow-hidden rounded-lg">
            <img
              className="w-full h-96 object-cover transition-transform duration-500 group-hover:scale-105"
              src="https://images.unsplash.com/photo-1594223274512-ad4803739b7c?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80"
              alt="Sacs"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 group-hover:opacity-90"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <h3 className="text-2xl font-serif font-bold text-white">Sacs</h3>
              <p className="text-white mt-2 opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                Des sacs élégants pour compléter votre style
              </p>
              <button className="mt-4 px-4 py-2 bg-white text-gray-900 rounded-md opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                Découvrir →
              </button>
            </div>
          </div>
          <div className="relative group overflow-hidden rounded-lg">
            <img
              className="w-full h-96 object-cover transition-transform duration-500 group-hover:scale-105"
              src="https://images.unsplash.com/photo-1589363245639-ee2295deb68d?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80"
              alt="Accessoires"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 group-hover:opacity-90"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <h3 className="text-2xl font-serif font-bold text-white">Accessoires</h3>
              <p className="text-white mt-2 opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                Les détails qui font toute la différence
              </p>
              <button className="mt-4 px-4 py-2 bg-white text-gray-900 rounded-md opacity-0 transform translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
                Découvrir →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <TestimonialsSlider />

      {/* Instagram Feed */}
      <InstagramFeed />

      {/* Newsletter */}
      <Newsletter />
    </>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Routes administrateur */}
          <Route path="/admin/login" element={<AdminAuth.Login />} />
          <Route path="/admin/dashboard" element={<AdminCore.Dashboard />} />
          <Route path="/admin/products" element={<AdminProducts.List />} />
          <Route path="/admin/products/new" element={<AdminProducts.New />} />
          <Route path="/admin/products/:id/edit" element={<AdminProducts.Edit />} />
          <Route path="/admin/categories" element={<AdminProducts.Categories />} />
          <Route path="/admin/menu-categories" element={<AdminProducts.MenuCategories />} />
          <Route path="/admin/media" element={<AdminProducts.Media />} />
          <Route path="/admin/product-import" element={<AdminProducts.Import />} />
          <Route path="/admin/users" element={<AdminUsers.List />} />
          <Route path="/admin/users/new" element={<AdminUsers.New />} />
          <Route path="/admin/users/:id/edit" element={<AdminUsers.Edit />} />
          <Route path="/admin/gift-cards" element={<AdminCommerce.GiftCards />} />
          <Route path="/admin/gift-cards/received" element={<AdminCommerce.ReceivedGiftCards />} />
          <Route path="/admin/suppliers" element={<AdminCommerce.Suppliers />} />
          <Route path="/admin/suppliers/new" element={<AdminCommerce.NewSupplier />} />
          <Route path="/admin/suppliers/:id/edit" element={<AdminCommerce.EditSupplier />} />
          <Route path="/admin/orders" element={<AdminCommerce.Orders />} />
          <Route path="/admin/orders/:id" element={<AdminCommerce.OrderDetail />} />
          <Route path="/admin/roles" element={<AdminUsers.Roles />} />
          <Route path="/admin/user-roles" element={<AdminUsers.UserRoles />} />
          <Route path="/admin/settings" element={<AdminCore.Settings />} />
          <Route path="/admin/banners" element={<AdminCore.Banners />} />
          
          {/* Routes publiques */}
          <Route
            path="*"
            element={
              <>
                <Navigation />
                <main className="flex-grow">
                  <Routes>
                    <Route path="/\" element={<HomePage />} />
                    <Route path="/nouveautes" element={<NouveautesPage />} />
                    <Route path="/vetements/robes" element={<DressesPage />} />
                    <Route path="/categorie/:slug" element={<CategoryPage />} />
                    <Route path="/produit/:id" element={<ProductDetailPage />} />
                    <Route path="/panier" element={<CartPage />} />
                    <Route path="/commande" element={<CheckoutPage />} />
                    <Route path="/commande/confirmation" element={<OrderConfirmationPage />} />
                    <Route path="/connexion" element={<LoginPage />} />
                    <Route path="/inscription" element={<SignupPage />} />
                    <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
                    <Route path="/reinitialiser-mot-passe" element={<ResetPasswordPage />} />
                    <Route path="/profil" element={<ProfilePage />} />
                    <Route path="/cheque-cadeau" element={<GiftCardPage />} />
                  </Routes>
                </main>
                <Footer />
              </>
            }
          />
        </Routes>
      </Suspense>
    </div>
  );
}

export default App;