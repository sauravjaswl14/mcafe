import { BeanJourney } from '@/components/store/BeanJourney';
import { CartDrawer } from '@/components/store/CartDrawer';
import { Cursor } from '@/components/store/Cursor';
import { FlavorMarquee } from '@/components/store/FlavorMarquee';
import { Footer } from '@/components/store/Footer';
import { Hero } from '@/components/store/Hero';
import { Manifesto } from '@/components/store/Manifesto';
import { MenuSection } from '@/components/store/MenuSection';
import { Navbar } from '@/components/store/Navbar';
import { Preloader } from '@/components/store/Preloader';
import { Products } from '@/components/store/Products';
import { SmoothScroll } from '@/components/store/SmoothScroll';

export default function HomePage() {
  return (
    <main>
      <SmoothScroll />
      <Cursor />
      <Preloader />
      <Navbar />
      <Hero />
      <FlavorMarquee />
      <Manifesto />
      <BeanJourney />
      <Products />
      <MenuSection />
      <Footer />
      <CartDrawer />
    </main>
  );
}
