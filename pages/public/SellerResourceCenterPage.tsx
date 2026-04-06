import React from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import { useAuth } from '../../hooks/useAuth';

const ResourceArticleCard: React.FC<{ title: string; excerpt: string; link: string; delay?: number }> = ({ title, excerpt, link, delay = 0 }) => {
    const cardRef = useScrollReveal<HTMLDivElement>();
    return (
        <div ref={cardRef} className="animate-reveal bg-white dark:bg-dark-surface p-6 rounded-lg shadow-soft border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:-translate-y-1 transition-all" style={{ transitionDelay: `${delay}ms` }}>
            <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400 mt-2 mb-4">{excerpt}</p>
            <Link to={link} className="font-semibold text-primary text-sm">Read Guide &rarr;</Link>
        </div>
    );
};


const SellerResourceCenterPage: React.FC = () => {
    const heroRef = useScrollReveal<HTMLDivElement>();
    const ctaRef = useScrollReveal<HTMLDivElement>();
    const { openOnboarding } = useAuth();

    const articles = [
        { title: "Photography 101: Taking Photos That Sell", excerpt: "Learn the basics of lighting, composition, and editing to make your product photos stand out.", link: "#" },
        { title: "Pricing Your Items: A Guide to Competitive Rates", excerpt: "Find the sweet spot for your rental and sale prices to maximize earnings and attract buyers.", link: "#" },
        { title: "Shipping Made Simple: Best Practices for Sellers", excerpt: "From packaging to choosing a carrier, we cover everything you need to know to ship items safely.", link: "#" },
        { title: "Writing Descriptions That Convert", excerpt: "Master the art of copywriting to create compelling listings that turn browsers into buyers.", link: "#" },
    ];

    return (
        <div className="bg-gray-50 dark:bg-dark-background min-h-screen animate-fade-in-up">
            <section ref={heroRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-24 text-center">
                <h1 className="text-5xl md:text-7xl font-extrabold font-display text-gray-900 dark:text-dark-text">
                    Seller Resource Center
                </h1>
                <p className="mt-6 text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    Your hub for tips, guides, and best practices to help you grow your business on Urban Prime.
                </p>
            </section>

            <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-soft dark:border-gray-700 dark:bg-dark-surface sm:p-8">
                    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-primary">Spotlight seller path</p>
                            <h2 className="mt-3 text-2xl font-black text-gray-900 dark:text-dark-text sm:text-3xl">
                                Turn listings into story-driven Spotlight posts.
                            </h2>
                            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                                Use Spotlight to pull more attention into your best products, move shoppers to item detail, and keep the buyer journey flowing into cart and checkout.
                            </p>
                            <div className="mt-5 flex flex-wrap gap-2">
                                <Link to="/spotlight" className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-white/5 dark:text-white">
                                    Open Spotlight
                                </Link>
                                <Link to="/spotlight/create" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                                    Create Spotlight post
                                </Link>
                                <Link to="/profile/become-a-provider" className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-dark-background dark:text-white">
                                    Become a seller
                                </Link>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/5">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Discovery</p>
                                <p className="mt-2 text-2xl font-black text-gray-900 dark:text-dark-text">1 feed</p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/5">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Checkout</p>
                                <p className="mt-2 text-2xl font-black text-gray-900 dark:text-dark-text">1 tap</p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/5">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Stories</p>
                                <p className="mt-2 text-2xl font-black text-gray-900 dark:text-dark-text">Live</p>
                            </div>
                            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/5">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Sales</p>
                                <p className="mt-2 text-2xl font-black text-gray-900 dark:text-dark-text">Track</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-16">
                <h2 className="text-3xl font-bold font-display text-center mb-12 dark:text-dark-text">Featured Guides</h2>
                <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {articles.map((article, index) => (
                        <ResourceArticleCard key={article.title} {...article} delay={index * 100} />
                    ))}
                </div>
            </div>
            
            <section ref={ctaRef} className="animate-reveal container mx-auto px-4 sm:px-6 lg:px-8 pb-24">
                <div className="bg-primary/10 dark:bg-primary/20 p-12 rounded-lg text-center">
                    <h2 className="text-3xl font-display font-bold mb-4 text-gray-900 dark:text-dark-text">Ready to Start Selling?</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
                        Join our community of entrepreneurs and turn your unused items into income.
                    </p>
                    <button
                        onClick={() => openOnboarding('list', '/profile/become-a-provider')}
                        className="inline-block bg-primary text-white font-bold py-3 px-10 rounded-full hover:opacity-90 transition-colors text-lg"
                    >
                        Become a Seller
                    </button>
                </div>
            </section>
        </div>
    );
};

export default SellerResourceCenterPage;
