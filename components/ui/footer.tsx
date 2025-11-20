"use client";

import { cn } from "@/lib/utils";
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandTwitter,
  IconBrandYoutube,
  IconMail,
  IconPhone,
  IconMapPin,
} from "@tabler/icons-react";
import Link from "next/link";
import { Ribbon } from 'lucide-react';

interface FooterProps {
  className?: string;
}

interface FooterSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

interface FooterLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

const FooterSection = ({ title, children, className }: FooterSectionProps) => {
  return (
    <div className={cn("flex flex-col space-y-4", className)}>
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-[-0.07em]">
        {title}
      </h3>
      {children}
    </div>
  );
};

const FooterLink = ({ href, children, className }: FooterLinkProps) => {
  return (
    <Link
      href={href}
      className={cn(
        "text-sm text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 tracking-[-0.07em]",
        className
      )}
    >
      {children}
    </Link>
  );
};

export const Footer = ({ className }: FooterProps) => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    company: [
      { name: "О нас", href: "/about" },
      { name: "Блог", href: "#blog" },
      { name: "Карьера", href: "#careers" },
      { name: "Контакты", href: "#contact" },
    ],
    services: [
      { name: "AI-Гид", href: "#ai" },
      { name: "Карта", href: "#map" },
      { name: "Бронирования", href: "#booking" },
      { name: "Безопасность", href: "#safety" },
    ],
    support: [
      { name: "Помощь", href: "#help" },
      { name: "FAQ", href: "#faq" },
      { name: "Политика конфиденциальности", href: "#privacy" },
      { name: "Условия использования", href: "#terms" },
    ],
  };

  const socialLinks = [
    {
      name: "Facebook",
      href: "#",
      icon: IconBrandFacebook,
    },
    {
      name: "Instagram",
      href: "#",
      icon: IconBrandInstagram,
    },
    {
      name: "Twitter",
      href: "#",
      icon: IconBrandTwitter,
    },
    {
      name: "YouTube",
      href: "#",
      icon: IconBrandYoutube,
    },
  ];

  return (
    <footer
      className={cn(
        "relative border-t border-neutral-200 bg-white/80 backdrop-blur-sm dark:border-neutral-800 dark:bg-neutral-950/80",
        className
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 tracking-[-0.07em]">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="#" className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-full bg-[#006948] flex items-center justify-center">
                <span className="text-white font-bold text-sm"><Ribbon /></span>
              </div>
              <span className="text-xl font-tapestry text-neutral-900 dark:text-white">
                sayahat
              </span>
            </Link>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 max-w-md">
              Ваш надежный спутник в путешествиях. Откройте для себя новые места
              с помощью AI-гида и безопасных маршрутов.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-sm text-neutral-600 dark:text-neutral-400">
                <IconMail className="h-4 w-4" />
                <span>info@sayahat.com</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-neutral-600 dark:text-neutral-400">
                <IconPhone className="h-4 w-4" />
                <span>+7 (771) 368-13-33</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-neutral-600 dark:text-neutral-400">
                <IconMapPin className="h-4 w-4" />
                <span>Алматы, Казахстан</span>
              </div>
            </div>
          </div>

          {/* Company Links */}
          <FooterSection title="Компания">
            {footerLinks.company.map((link) => (
              <FooterLink key={link.name} href={link.href}>
                {link.name}
              </FooterLink>
            ))}
          </FooterSection>

          {/* Services Links */}
          <FooterSection title="Сервисы">
            {footerLinks.services.map((link) => (
              <FooterLink key={link.name} href={link.href}>
                {link.name}
              </FooterLink>
            ))}
          </FooterSection>

          {/* Support Links */}
          <FooterSection title="Поддержка">
            {footerLinks.support.map((link) => (
              <FooterLink key={link.name} href={link.href}>
                {link.name}
              </FooterLink>
            ))}
          </FooterSection>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 border-t border-neutral-200 pt-8 dark:border-neutral-800">
          <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              © {currentYear} sayahat. Все права защищены.
            </p>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => {
                const Icon = social.icon;
                return (
                  <Link
                    key={social.name}
                    href={social.href}
                    className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
                    aria-label={social.name}
                  >
                    <Icon className="h-5 w-5" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

