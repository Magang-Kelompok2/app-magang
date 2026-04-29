"use client";

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

const NAV_LINKS = [
  { href: '/',     label: 'Dashboard' },
  { href: '/app',  label: 'App' },
  { href: '/about',label: 'About' },
];

const Navbar = () => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <nav className="bg-(--pajak-base) px-20 py-4 grid grid-cols-3 items-center shadow-md">
      <div className="flex items-center justify-self-start">
        <Link href="/">
          <Image
            src="/Logo.svg"
            alt="Sistem Informasi Analisis Putusan Pajak"
            width={250}
            height={50}
            className="object-contain"
          />
        </Link>
      </div>

      <div className="flex items-center justify-self-center gap-8 font-(family-name:--font-montserrat) text-white text-sm font-medium">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`px-6 py-2 rounded-md transition-all ${
              isActive(href)
                ? "bg-(--pajak-primary) hover:brightness-110"
                : "hover:text-(--pajak-secondary)"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-self-end font-(family-name:--font-montserrat) text-white text-sm font-medium">
        {session?.user && (
          <div className="flex items-center gap-3">
            <span className="text-white/70 text-xs">{session.user.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-4 py-2 rounded-md text-sm text-white bg-white/10 hover:bg-white/20 transition-colors"
            >
              Keluar
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
