import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';

const AddIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;
const ProductsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
const SalesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;

interface SellerSidebarProps {
  isOpen: boolean;
}

const SellerSidebar: React.FC<SellerSidebarProps> = ({ isOpen }) => {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    const linkClass = `flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 relative group ${
      isDark 
        ? 'text-slate-300' 
        : 'text-slate-700'
    }`;
    const activeLinkClass = `${
      isDark
        ? 'bg-gradient-to-r from-primary/25 to-primary/10 text-primary font-semibold shadow-sm border border-primary/30'
        : 'bg-gradient-to-r from-primary/15 to-primary/5 text-primary font-semibold shadow-sm border border-primary/20'
    }`;
    const inactiveLinkClass = `${
      isDark
        ? 'hover:bg-slate-700 hover:text-slate-100 border border-transparent'
        : 'hover:bg-slate-100 hover:text-slate-900 border border-transparent'
    }`;

    const getNavLinkClass = ({ isActive }: { isActive: boolean }) => 
        `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`;

    const sidebarVariants = {
      open: { x: 0, opacity: 1 },
      closed: { x: -256, opacity: 0.5 }
    };

    return (
        <motion.aside 
          initial={false}
          animate={isOpen ? 'open' : 'closed'}
          variants={sidebarVariants}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className={`fixed top-0 left-0 h-full flex-shrink-0 flex flex-col z-40 ${
            isOpen ? 'w-64' : 'w-20'
          } border-r-2 shadow-2xl transition-all duration-300 ${
            isDark
              ? 'bg-gradient-to-b from-slate-800 to-slate-900 border-r-slate-700'
              : 'bg-gradient-to-b from-slate-50 to-white border-r-slate-200'
          }`}
        >
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className={`p-4 border-b-2 h-16 flex items-center justify-between group transition-colors duration-300 ${
                isDark
                  ? 'border-b-slate-700 bg-slate-700/50'
                  : 'border-b-slate-200 bg-slate-50/50'
              }`}
            >
                <Link to="/seller/dashboard" className="text-xl font-bold font-display flex items-center gap-2 flex-shrink-0">
                    <span className="text-white bg-gradient-to-br from-primary to-primary/80 rounded-lg p-1 text-lg font-black shadow-md">UM</span>
                    <motion.span 
                      animate={{ opacity: isOpen ? 1 : 0, width: isOpen ? 'auto' : 0 }}
                      transition={{ duration: 0.2 }}
                      className={`transition-opacity duration-200 font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}
                    >
                      Seller
                    </motion.span>
                </Link>
                {!isOpen && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`hidden group-hover:block absolute left-24 text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg font-semibold ${
                      isDark
                        ? 'bg-slate-700 text-slate-200'
                        : 'bg-slate-800 text-white'
                    }`}
                  >
                    Seller
                  </motion.div>
                )}
            </motion.div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  <NavLink to="/seller/products/new" className={getNavLinkClass}>
                      {({ isActive }) => (
                          <>
                              <AddIcon />
                              <motion.span 
                                animate={{ opacity: isOpen ? 1 : 0, width: isOpen ? 'auto' : 0 }}
                                transition={{ duration: 0.2 }}
                                className="whitespace-nowrap"
                              >
                                Add Product
                              </motion.span>
                              {!isOpen && (
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  whileHover={{ opacity: 1 }}
                                  transition={{ duration: 0.2 }}
                                  className={`hidden group-hover:block absolute left-24 text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg font-semibold ${
                                    isDark
                                      ? 'bg-slate-700 text-slate-200'
                                      : 'bg-slate-800 text-white'
                                  }`}
                                >
                                  Add Product
                                </motion.div>
                              )}
                          </>
                      )}
                  </NavLink>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <NavLink to="/seller/products" className={getNavLinkClass} end>
                      {({ isActive }) => (
                          <>
                              <ProductsIcon />
                              <motion.span 
                                animate={{ opacity: isOpen ? 1 : 0, width: isOpen ? 'auto' : 0 }}
                                transition={{ duration: 0.2 }}
                                className="whitespace-nowrap"
                              >
                                My Products
                              </motion.span>
                              {!isOpen && (
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  whileHover={{ opacity: 1 }}
                                  transition={{ duration: 0.2 }}
                                  className={`hidden group-hover:block absolute left-24 text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg font-semibold ${
                                    isDark
                                      ? 'bg-slate-700 text-slate-200'
                                      : 'bg-slate-800 text-white'
                                  }`}
                                >
                                  My Products
                                </motion.div>
                              )}
                          </>
                      )}
                  </NavLink>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <NavLink to="/seller/sales" className={getNavLinkClass}>
                      {({ isActive }) => (
                          <>
                              <SalesIcon />
                              <motion.span 
                                animate={{ opacity: isOpen ? 1 : 0, width: isOpen ? 'auto' : 0 }}
                                transition={{ duration: 0.2 }}
                                className="whitespace-nowrap"
                              >
                                Sales & Rentals
                              </motion.span>
                              {!isOpen && (
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  whileHover={{ opacity: 1 }}
                                  transition={{ duration: 0.2 }}
                                  className={`hidden group-hover:block absolute left-24 text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg font-semibold ${
                                    isDark
                                      ? 'bg-slate-700 text-slate-200'
                                      : 'bg-slate-800 text-white'
                                  }`}
                                >
                                  Sales & Rentals
                                </motion.div>
                              )}
                          </>
                      )}
                  </NavLink>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <NavLink to="/seller/settings" className={getNavLinkClass}>
                      {({ isActive }) => (
                          <>
                              <SettingsIcon />
                              <motion.span 
                                animate={{ opacity: isOpen ? 1 : 0, width: isOpen ? 'auto' : 0 }}
                                transition={{ duration: 0.2 }}
                                className="whitespace-nowrap"
                              >
                                Settings
                              </motion.span>
                              {!isOpen && (
                                <motion.div 
                                  initial={{ opacity: 0 }}
                                  whileHover={{ opacity: 1 }}
                                  transition={{ duration: 0.2 }}
                                  className={`hidden group-hover:block absolute left-24 text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg font-semibold ${
                                    isDark
                                      ? 'bg-slate-700 text-slate-200'
                                      : 'bg-slate-800 text-white'
                                  }`}
                                >
                                  Settings
                                </motion.div>
                              )}
                          </>
                      )}
                  </NavLink>
                </motion.div>
            </nav>

            {/* Footer */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className={`p-4 border-t-2 text-center text-xs transition-colors duration-300 ${
                isDark
                  ? 'border-t-slate-700 text-slate-400 bg-slate-700/50'
                  : 'border-t-slate-200 text-slate-500 bg-slate-50/50'
              }`}
            >
                <motion.span 
                  animate={{ opacity: isOpen ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="urban-prime-wordmark-tight transition-opacity duration-200"
                >
                  Urban Prime
                </motion.span>
            </motion.div>
        </motion.aside>
    );
};

export default SellerSidebar;
