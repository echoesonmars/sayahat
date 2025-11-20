"use client";

import { useState, useEffect } from "react";
import { Menu, X, User, LogOut } from "lucide-react";
import { Ribbon } from 'lucide-react';
import { TextAnimate } from "@/components/ui/text-animate";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const navItems = [
    { name: "Главная", link: "/" },
    { name: "AI-Гид", link: "/ai-guide" },
    /* { name: "Карта", link: "/map" }, */
    { name: "Бронирования", link: "/booking" },
    { name: "Безопасность", link: "/safety" },
    { name: "О нас", link: "/about" },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className="fixed inset-x-0 top-0 z-50 w-full">

      <div className="hidden lg:flex justify-center px-4 py-4">
        <div
          style={{
            width: isScrolled ? "75%" : "100%",
            minWidth: isScrolled ? "1100px" : "auto",
            transform: isScrolled ? "translateY(20px)" : "translateY(0px)",
          }}
          className={`
            relative flex items-center justify-between px-6 py-3 rounded-full
            transition-all duration-500 ease-out max-w-7xl
            ${
              isScrolled
                ? "bg-white/80 dark:bg-neutral-950/80 backdrop-blur-lg shadow-[0_0_24px_rgba(34,42,53,0.06),0_1px_1px_rgba(0,0,0,0.05),0_0_0_1px_rgba(34,42,53,0.04),0_0_4px_rgba(34,42,53,0.08),0_16px_68px_rgba(47,48,55,0.05),0_1px_0_rgba(255,255,255,0.1)_inset]"
                : "bg-transparent"
            }
          `}
        >

          <a href="/" className="flex items-center space-x-1 z-20 relative">
            <Ribbon className="text-[#006948]"/>
            <span className="font-tapestry tracking-[-0.07em] text-xl text-black dark:text-white  whitespace-nowrap">
              sayahat
            </span>
          </a>

          <div className="tracking-[-0.07em] absolute inset-0 flex items-center justify-center space-x-1 pointer-events-none">
            <div className="flex space-x-1 pointer-events-auto">
              {navItems.map((item, idx) => (
                <a
                  key={idx}
                  href={item.link}
                  onMouseEnter={() => setHoveredIndex(idx)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className="relative px-4 py-2 text-sm font text-neutral-600 dark:text-neutral-300 transition-colors duration-200 hover:text-neutral-900 dark:hover:text-white whitespace-nowrap"
                >
                  {hoveredIndex === idx && (
                    <span 
                      key="hover-bg"
                      className="absolute inset-0 rounded-full bg-gray-100 dark:bg-neutral-800 -z-10"
                      style={{
                        animation: "scaleIn 0.2s ease-out forwards"
                      }}
                    />
                  )}
                  <span className="relative z-10">{item.name}</span>
                </a>
              ))}
            </div>
          </div>

          <style jsx>{`
            @keyframes scaleIn {
              from {
                transform: scale(0.8);
                opacity: 0;
              }
              to {
                transform: scale(1);
                opacity: 1;
              }
            }
          `}</style>


          <div className="flex items-center gap-3 z-20 relative">
            {session?.user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 text-sm text-[#006948]">
                  <User className="h-4 w-4" />
                  <span className="tracking-[-0.07em]">{session.user.name || session.user.email}</span>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="tracking-[-0.07em] px-3 py-2 rounded-md text-sm text-white bg-[#006948] hover:bg-[#00A36C] transition-colors duration-200 whitespace-nowrap flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Выйти
                </button>
              </div>
            ) : (
              <>
                <Link href="/auth/signin" className="tracking-[-0.07em] px-3 py-2 text-sm text-[#006948] dark:text-white bg-transparent hover:-translate-y-0.5 transition-transform duration-200 whitespace-nowrap">
                  Войти
                </Link>
                <Link href="/auth/signup" className="tracking-[-0.07em] px-3 py-2 rounded-md text-sm text-white bg-[#006948] shadow-[0_0_24px_rgba(34,42,53,0.06),0_1px_1px_rgba(0,0,0,0.05),0_0_0_1px_rgba(34,42,53,0.04),0_0_4px_rgba(34,42,53,0.08),0_16px_68px_rgba(47,48,55,0.05),0_1px_0_rgba(255,255,255,0.1)_inset] hover:-translate-y-0.5 transition-transform duration-200 whitespace-nowrap">
                  Регистрация
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="lg:hidden px-4 py-4">
        <div
          style={{
            width: isScrolled ? "90%" : "100%",
            transform: isScrolled ? "translateY(20px)" : "translateY(0px)",
          }}
          className={`
            flex flex-col mx-auto px-4 py-3 rounded-3xl
            transition-all duration-500 ease-out
            ${
              isScrolled
                ? "bg-white/80 dark:bg-neutral-950/80 backdrop-blur-lg shadow-[0_0_24px_rgba(34,42,53,0.06),0_1px_1px_rgba(0,0,0,0.05),0_0_0_1px_rgba(34,42,53,0.04),0_0_4px_rgba(34,42,53,0.08),0_16px_68px_rgba(47,48,55,0.05),0_1px_0_rgba(255,255,255,0.1)_inset]"
                : "bg-transparent"
            }
          `}
        >
          <div className="flex items-center justify-between">
    <a
      href="#"
      className="relative z-20 mr-4 flex items-center space-x-1 px-2 py-1 text-sm font-normal"
    >
      <Ribbon className="text-[#006948]"/>
      <h1 className="font-tapestry tracking-[-0.07em] text-[#006948] dark:text-white ">sayahat</h1>
    </a>

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-black dark:text-white p-2 transition-transform duration-200 hover:scale-110"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          <div
            className={`
              overflow-hidden transition-all duration-500 ease-out
              ${isMobileMenuOpen ? "max-h-[600px] opacity-100 mt-4" : "max-h-0 opacity-0"}
            `}
          >
            <div className="flex flex-col gap-4 pb-4 bg-white dark:bg-neutral-950 rounded-lg p-4 shadow-lg">
              {navItems.map((item, idx) => (
                <a
                  key={idx}
                  href={item.link}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white transition-all duration-200 hover:translate-x-1"
                >
                  {item.name}
                </a>
              ))}
              <div className="flex flex-col gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                {session?.user ? (
                  <>
                    <div className="px-4 py-2 text-sm text-neutral-600 dark:text-neutral-300 flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>{session.user.name || session.user.email}</span>
                    </div>
                    <button
                      onClick={() => {
                        signOut({ callbackUrl: '/' });
                        setIsMobileMenuOpen(false);
                      }}
                      className="tracking-[-0.07em] w-full px-4 py-2 rounded-md text-sm text-white bg-[#006948] hover:bg-[#00A36C] transition-colors duration-200 flex items-center justify-center gap-2"
                    >
                      <LogOut className="h-4 w-4" />
                      Выйти
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/signin"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full px-4 py-2 rounded-md text-sm text-black bg-gray-100 hover:bg-gray-200 transition-colors duration-200 text-center"
                    >
                      <h1 className="tracking-[-0.07em]">Войти</h1>
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="tracking-[-0.07em] w-full px-4 py-2 rounded-md text-sm text-white bg-[#006948] hover:bg-[#00A36C] transition-colors duration-200 text-center"
                    >
                      Регистрация
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}