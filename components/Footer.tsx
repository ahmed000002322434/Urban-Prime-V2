


// components/Footer.tsx
import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { THEMES } from '../context/ThemeContext';
import { useTranslation } from '../hooks/useTranslation';

const TwitterIcon = () => <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>;
const FacebookIcon = () => <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"></path></svg>;
const InstagramIcon = () => <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.585-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.585-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.585.069-4.85c.149-3.225 1.664 4.771 4.919 4.919 1.266-.058 1.644.07 4.85.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.059-1.281.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98C15.667 0 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.88 1.44 1.44 0 000-2.88z"></path></svg>;

const PaletteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10c2.13 0 4.09-.67 5.65-1.82.4-.33.6-.82.49-1.32-.12-.55-.63-1-1.2-1.1-1.22-.2-2.38-.61-3.4-1.21a.99.99 0 0 1-.5-1.42c.76-1.1 1.2-2.38 1.2-3.75 0-2.32-1.2-4.37-3-5.5z"/><path d="M17.84 12.16a6 6 0 0 1-1.36 2.37.99.99 0 0 1-1.42.5 10.02 10.02 0 0 0-1.21 3.4c-.1.57.38 1.08 1.1 1.2.48.08 1 .3 1.5.73 1.65-1.56 2.47-3.52 2.47-5.65 0-1.37-.44-2.65-1.2-3.75Z"/></svg>;
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
const ChevronUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>;
const SystemThemeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 21V3M16 21V3"/></svg>;


const ThemeSelector = () => {
    const { theme, setTheme, themes } = useTheme();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(p => !p)} className="p-2 rounded-full text-footer-text-secondary hover:bg-white/10 transition-colors" aria-label="Select theme">
                <PaletteIcon />
            </button>
            {isOpen && (
                <div onMouseLeave={() => setIsOpen(false)} className="absolute bottom-full mb-3 right-0 md:right-auto md:left-1/2 md:-translate-x-1/2 w-56 bg-surface border border-border rounded-lg shadow-2xl p-2 z-10 animate-fade-in-up">
                    <h4 className="text-xs font-bold text-text-secondary px-2 pb-1 uppercase">Select Theme</h4>
                    {themes.map(t => (
                        <button 
                            key={t.name} 
                            onClick={() => setTheme(t.name)} 
                            className={`w-full flex items-center gap-3 p-2 rounded-md text-sm transition-colors ${theme === t.name ? 'bg-primary/20 text-primary' : 'hover:bg-surface-soft text-text-secondary'}`}
                        >
                            <div className="w-5 h-5 rounded-full flex items-center justify-center border-2 border-white/50" style={{ backgroundColor: t.name === 'system' ? '#888' : t.colors.primary }}>
                              {t.name === 'system' ? <SystemThemeIcon/> : (theme === t.name && <CheckIcon />)}
                            </div>
                            <span className="text-text-primary flex-1 text-left">{t.label}</span>
                            {t.name === 'elite' && <span className="text-[10px] font-bold bg-primary text-primary-text px-1.5 rounded">NEW</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const FooterLink: React.FC<{ to: string, children: React.ReactNode }> = ({ to, children }) => (
    <li>
        <Link to={to} className="text-footer-text-secondary hover:text-footer-text text-sm transition-colors">
            {children}
        </Link>
    </li>
);

const Footer: React.FC = () => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  // Secret Admin Logic
  const clickCountRef = useRef(0);
  const lastClickTimeRef = useRef(0);

  const handleSecretClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const now = Date.now();
    
    // Reset if time between clicks is too long (500ms)
    if (now - lastClickTimeRef.current > 500) {
        clickCountRef.current = 0;
    }
    
    clickCountRef.current += 1;
    lastClickTimeRef.current = now;

    if (clickCountRef.current === 3) {
        clickCountRef.current = 0;
        navigate('/admin-login');
    }
  };

  return (
    // Added backdrop-blur-xl and border-t border-white/5 for glass effect across all themes
    <footer className="bg-footer-background text-footer-text relative z-[60] backdrop-blur-xl border-t border-white/5">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[800px] opacity-100 mb-12' : 'max-h-0 opacity-0'}`}>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-10 gap-x-8">
               <div>
                <h4 className="font-bold text-sm tracking-wider text-footer-text mb-4 uppercase">Features</h4>
                <ul className="space-y-3">
                    <FooterLink to="/prime-pass">Prime Pass (NFT)</FooterLink>
                    <FooterLink to="/features">Future Tech Hub</FooterLink>
                    <FooterLink to="/versus">Versus Arena</FooterLink>
                    <FooterLink to="/mystery-box">Mystery Boxes</FooterLink>
                    <FooterLink to="/genie">Urban Genie AI</FooterLink>
                    <FooterLink to="/live">Live Shopping</FooterLink>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-wider text-footer-text mb-4 uppercase">Marketplace</h4>
                <ul className="space-y-3">
                  <FooterLink to="/browse">Browse All</FooterLink>
                  <FooterLink to="/rent">Rent Items</FooterLink>
                  <FooterLink to="/sell">Sell Items</FooterLink>
                  <FooterLink to="/dropshipping">Creator Hub</FooterLink>
                  <FooterLink to="/audit">Audit & Verify</FooterLink>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-sm tracking-wider text-footer-text mb-4 uppercase">{t('footer.digital')}</h4>
                <ul className="space-y-3">
                  <FooterLink to="/digital-products">Digital Assets</FooterLink>
                  <FooterLink to="/browse?category=games">Games</FooterLink>
                  <FooterLink to="/pixe">Pixe Studio</FooterLink>
                  <FooterLink to="/reels">Pixe Feed</FooterLink>
                </ul>
              </div>
              <div>
                <h4 
                    onClick={handleSecretClick}
                    className="font-bold text-sm tracking-wider text-footer-text mb-4 uppercase cursor-default select-none transition-opacity hover:opacity-80"
                >
                    {t('footer.company')}
                </h4>
                <ul className="space-y-3">
                  <FooterLink to="/about">About Us</FooterLink>
                  <FooterLink to="/how-it-works">How It Works</FooterLink>
                  <FooterLink to="/careers">Careers</FooterLink>
                  <FooterLink to="/press">Press</FooterLink>
                  <FooterLink to="/affiliate-program">Affiliates</FooterLink>
                </ul>
              </div>
               <div>
                <h4 className="font-bold text-sm tracking-wider text-footer-text mb-4 uppercase">{t('footer.support')}</h4>
                <ul className="space-y-3">
                    <FooterLink to="/support-center">Help Center</FooterLink>
                    <FooterLink to="/safety-center">Trust & Safety</FooterLink>
                    <FooterLink to="/privacy-policy">Privacy</FooterLink>
                    <FooterLink to="/terms-of-use">Terms</FooterLink>
                </ul>
              </div>
            </div>
        </div>

        <div className={`transition-all duration-300 ${isExpanded ? 'border-t border-white/20 pt-8' : 'border-t border-transparent pt-0'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex-1 flex justify-center sm:justify-start items-center gap-4">
                    <ThemeSelector />
                     <Link to="/" className="text-xl font-extrabold font-display hidden lg:block">
                        <span className="text-footer-text">Urban</span><span className="text-primary">Prime</span>
                    </Link>
                </div>
                <div className="flex-1 flex flex-col items-center order-first sm:order-none">
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-footer-text-secondary hover:text-footer-text mb-2" aria-label={isExpanded ? 'Collapse footer' : 'Expand footer'}>
                        <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                          <ChevronUpIcon />
                        </div>
                    </button>
                    <p className="text-sm text-gray-500">© 2025 Urban Prime. All rights reserved.</p>
                </div>
                <div className="flex-1 flex justify-center sm:justify-end">
                    <div className="flex space-x-4 text-footer-text-secondary">
                        <a href="#" target="_blank" rel="noopener noreferrer" className="hover:text-footer-text" aria-label="Twitter"><TwitterIcon/></a>
                        <a href="#" target="_blank" rel="noopener noreferrer" className="hover:text-footer-text" aria-label="Facebook"><FacebookIcon/></a>
                        <a href="https://www.instagram.com/ahmad_offcl/" target="_blank" rel="noopener noreferrer" className="hover:text-footer-text" aria-label="Instagram"><InstagramIcon/></a>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
