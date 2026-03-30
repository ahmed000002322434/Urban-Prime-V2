import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import UserSidebar from '../components/dashboard/UserSidebar';
import { SearchSuggestionsDropdown } from '../components/dashboard/SearchSuggestionsDropdown';

const DashboardLayout: React.FC = () => {
  const { user, logout, personas, activePersona, setActivePersona } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchSuggestionsOpen, setIsSearchSuggestionsOpen] = useState(false);
  const [isPersonaDropdownOpen, setIsPersonaDropdownOpen] = useState(false);
  const personaDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileNavOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personaDropdownRef.current && !personaDropdownRef.current.contains(e.target as Node)) {
        setIsPersonaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setIsSearchSuggestionsOpen(true);
    setIsPersonaDropdownOpen(false);
  };

  const handleSwitchPersona = async (personaId: string) => {
    try {
      await setActivePersona(personaId, { requireConfirmation: false });
      setIsPersonaDropdownOpen(false);
      navigate('/profile');
    } catch (error) {
      console.error('Failed to switch persona:', error);
    }
  };

  return (
    <div className="dashboard-shell min-h-screen flex bg-transparent font-sans overflow-x-hidden">
      {/* Sidebar */}
      <UserSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Topbar */}
        <header className="h-20 flex items-center justify-between px-6 md:px-10 sticky top-0 z-[120] shrink-0 glass-panel glass-panel-overflow-visible !overflow-visible border-b border-white/10 bg-background/95 backdrop-blur-xl">
          <div className="flex items-center gap-6 flex-1 max-w-2xl">
            <button 
              onClick={() => {
                setIsMobileNavOpen(true);
                setIsPersonaDropdownOpen(false);
                setIsSearchSuggestionsOpen(false);
              }}
              className="md:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:bg-white/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"></line><line x1="4" y1="6" x2="20" y2="6"></line><line x1="4" y1="18" x2="20" y2="18"></line></svg>
            </button>
            
            {/* Command Search Bar */}
            <div className="relative flex-1 hidden sm:block">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  setIsSearchSuggestionsOpen(true);
                  setIsPersonaDropdownOpen(false);
                }}
                placeholder="Search anything... (Ctrl + K)"
                className="w-full h-11 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 hover:border-white/30 transition-all placeholder:text-text-secondary placeholder:opacity-40"
              />
              <SearchSuggestionsDropdown 
                query={searchQuery}
                isOpen={isSearchSuggestionsOpen}
                onClose={() => setIsSearchSuggestionsOpen(false)}
                onNavigate={(path) => {
                  navigate(path);
                  setSearchQuery('');
                  setIsSearchSuggestionsOpen(false);
                  setIsPersonaDropdownOpen(false);
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            {/* Quick Access Actions */}
            <div className="hidden sm:flex items-center gap-2 border-r border-white/10 pr-4 mr-1">
                <Link to="/" className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-primary hover:bg-primary/5 transition-all" title="Home">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </Link>
                <Link to="/profile/messages" className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-primary hover:bg-primary/5 transition-all relative group" title="Messages">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><rect width="20" height="14" x="2" y="5" rx="2"/></svg>
                    <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-[10px] font-black text-white flex items-center justify-center border-2 border-background scale-0 group-hover:scale-100 transition-transform">0</span>
                </Link>
                <Link to="/profile/wishlist" className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-red-500 hover:bg-red-500/5 transition-all" title="Wishlist">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                </Link>
            </div>



            {/* Persona Switcher & User Avatar */}
            <div className="relative h-full flex items-center" ref={personaDropdownRef}>
              <button 
                onClick={() => {
                  setIsPersonaDropdownOpen((prev) => !prev);
                  setIsSearchSuggestionsOpen(false);
                }}
                className="flex items-center gap-2 p-1 rounded-full hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
              >
                <div className="h-10 w-10 rounded-full bg-black border border-white/10 overflow-hidden ring-2 ring-white/5 ring-offset-2 ring-offset-background shrink-0">
                  {user?.avatar && <img src={user.avatar} className="h-full w-full object-cover" alt="" />}
                </div>
                <div className="hidden lg:block text-left pr-2">
                  <p className="text-xs font-black text-text-primary uppercase tracking-tight">{user?.name}</p>
                  <p className="text-[10px] text-text-secondary font-medium opacity-60 capitalize">{activePersona?.type || 'Member'}</p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-text-secondary opacity-50 transition-transform ${isPersonaDropdownOpen ? 'rotate-180' : ''}`}><path d="m6 9 6 6 6-6"/></svg>
              </button>

              <AnimatePresence>
                {isPersonaDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    className="absolute right-0 top-[calc(100%+0.75rem)] w-72 glass-float-panel dropdown-float dropdown-glow z-[140] p-2 rounded-3xl"
                  >
                    <div className="px-3 pt-3 pb-2 border-b border-white/10">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-secondary opacity-70">Switch Account</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="pill-chip">
                          Active <span className="text-white/80">{activePersona?.type || 'member'}</span>
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 mt-2">
                      {personas.map((p) => (
                        <motion.button
                          key={p.id}
                          onClick={() => handleSwitchPersona(p.id)}
                          whileHover={{ x: 4, scale: 1.01 }}
                          transition={{ type: "spring", stiffness: 320, damping: 22 }}
                          className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-2xl transition-all border ${
                            p.id === activePersona?.id
                              ? 'bg-primary/15 text-primary border-primary/30 shadow-[0_8px_20px_rgba(99,102,241,0.2)]'
                              : 'bg-white/5 text-text-secondary border-transparent hover:border-white/20 hover:text-text-primary hover:bg-white/10'
                          }`}
                        >
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-black text-xs ${p.id === activePersona?.id ? 'bg-primary text-white' : 'bg-white/5'}`}>
                            {p.type.charAt(0).toUpperCase()}
                          </div>
                          <div className="text-left flex-1">
                            <p className="text-xs font-black capitalize">{p.type}</p>
                            {p.id === activePersona?.id && <p className="text-[9px] font-bold uppercase tracking-tighter opacity-60">Active Now</p>}
                          </div>
                          {p.id === activePersona?.id && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M20 6 9 17l-5-5"/></svg>
                          )}
                        </motion.button>
                      ))}
                    </div>
                    <div className="my-2 border-t border-white/10" />
                    <button 
                      onClick={logout}
                      className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-bold text-xs"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Sign Out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-background/30">
          <div className="p-6 md:p-10 mx-auto w-full max-w-7xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileNavOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileNavOpen(false)}
              className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 150 }}
              className="fixed inset-y-0 left-0 z-[230] w-80 sidebar-mobile-solid flex flex-col border-r border-white/10 shadow-2xl rounded-r-[32px] overflow-hidden"
            >
               <div className="p-6 border-b border-white/10 h-20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-black p-1.5 font-black text-white text-xs">UP</div>
                    <div>
                        <span className="block font-black text-text-primary tracking-tighter text-sm">Urban Prime</span>
                        <span className="text-[10px] uppercase tracking-[0.2em] text-text-secondary font-black opacity-50">Dashboard</span>
                    </div>
                  </div>
                  <button onClick={() => setIsMobileNavOpen(false)} className="p-2 text-text-secondary hover:text-text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                  <NavLink to="/profile" end className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:bg-white/5'}`}>Overview</NavLink>
                  <NavLink to="/profile/orders" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:bg-white/5'}`}>Orders</NavLink>
                  <NavLink to="/profile/messages" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:bg-white/5'}`}>Inbox</NavLink>
                  <NavLink to="/profile/wishlist" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:bg-white/5'}`}>Wishlist</NavLink>
                  
                  <div className="my-4 border-t border-white/10 mx-2" />
                  <NavLink to="/profile/settings" className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:bg-white/5'}`}>Settings</NavLink>
               </div>

               <div className="p-4 border-t border-white/10 bg-white/5">
                  <div className="flex items-center gap-3 p-3 mb-4 rounded-xl glass-panel">
                    <div className="h-10 w-10 rounded-full bg-black border border-white/10 overflow-hidden shrink-0">
                      {user?.avatar && <img src={user.avatar} className="h-full w-full object-cover" alt="" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate text-text-primary uppercase tracking-tight">{user?.name}</p>
                      <p className="text-[10px] text-text-secondary truncate opacity-60 font-medium capitalize">{activePersona?.type}</p>
                    </div>
                  </div>
                  <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-500/10 transition-all">Logout</button>
               </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
