import React from 'react';
import AccountSidebar from '../../components/AccountSidebar';

const PackageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-24 h-24 text-slate-300">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 19.5v-8.25a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 11.25z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l-3.75-3.75M12 19.5l3.75-3.75M4.5 11.25h15" />
    </svg>
);


const PackagesPage: React.FC = () => {
    return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in-up">
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
                <AccountSidebar />
                <main className="flex-1 bg-white p-6 rounded-lg shadow-md border border-rentify-border">
                     <h1 className="text-xl font-bold border-b pb-3 mb-6">My Bought Packages</h1>
                     <div className="text-center py-16">
                        <PackageIcon />
                        <h2 className="font-bold text-xl mt-4">You have no active packages.</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Your purchased credit and promotional packages will appear here.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default PackagesPage;