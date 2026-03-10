import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const Navbar = () => {
  return (
    <nav className="bg-(--pajak-base) px-20 py-4 flex justify-between items-center shadow-md">
      {/* Left Side: Logo & Title (Combined Image) */}
      <div className="flex items-center">
        <Link href="/">
          <Image 
            src="/Logo.svg" // Ganti dengan nama file logo kamu di folder public
            alt="Sistem Informasi Analisis Putusan Pajak" 
            width={250}
            height={50}
            className="object-contain"
          />
        </Link>
      </div>
      
      {/* Right Side: Navigation Links */}
      <div className="flex items-center gap-8 font-(family-name:--font-montserrat) text-white text-sm font-medium">
        <Link 
          href="/" 
          className="bg-(--pajak-primary) px-6 py-2 rounded-md transition-all hover:brightness-110"
        >
          Dashboard
        </Link>
        
        <Link 
          href="/app" 
          className="hover:text-(--pajak-secondary) transition-colors"
        >
          App
        </Link>
        
        <Link 
          href="/about" 
          className="hover:text-(--pajak-secondary) transition-colors"
        >
          About
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;