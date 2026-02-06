import React from 'react';
// Corrected import for react-router-dom
import { Link } from 'react-router-dom';

const blogPosts = [
  {
    id: 1,
    title: "5 Tips for Creating the Perfect Rental Listing",
    excerpt: "Learn how to take great photos and write compelling descriptions to make your items stand out and attract more renters.",
    imageUrl: "https://picsum.photos/seed/blog1/800/400",
    category: "Lister Tips",
    date: "October 26, 2023",
  },
  {
    id: 2,
    title: "The Ultimate Checklist for Your Next Camping Trip",
    excerpt: "Don't get caught in the wild without the essentials. Here's a comprehensive list of gear you can rent for a safe and comfortable adventure.",
    imageUrl: "https://picsum.photos/seed/blog2/800/400",
    category: "Outdoors",
    date: "October 22, 2023",
  },
  {
    id: 3,
    title: "How the Circular Economy is Changing the Way We Live",
    excerpt: "Discover how renting instead of buying contributes to a more sustainable future, reduces waste, and strengthens local communities.",
    imageUrl: "https://picsum.photos/seed/blog3/800/400",
    category: "Community",
    date: "October 18, 2023",
  },
    {
    id: 4,
    title: "DIY Home Projects: Tools You Should Rent, Not Buy",
    excerpt: "Save money and storage space by renting these powerful tools for your next big home improvement project.",
    imageUrl: "https://picsum.photos/seed/blog4/800/400",
    category: "DIY",
    date: "October 15, 2023",
  },
];

const BlogsPage: React.FC = () => {
    return (
        <div className="bg-slate-50 dark:bg-dark-background min-h-screen animate-fade-in-up">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <header className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-primary">The Urban Prime Blog</h1>
                    <p className="mt-4 text-xl text-slate-600 dark:text-gray-400">Tips, stories, and insights from the Urban Prime community.</p>
                </header>

                <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-10">
                    {blogPosts.map(post => (
                        <div key={post.id} className="bg-white dark:bg-dark-surface rounded-lg shadow-lg overflow-hidden group">
                            <Link to="#">
                                <img src={post.imageUrl} alt={post.title} className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-300"/>
                                <div className="p-6">
                                    <p className="text-sm font-semibold text-primary mb-2">{post.category}</p>
                                    <h2 className="text-2xl font-bold mb-3 dark:text-dark-text">{post.title}</h2>
                                    <p className="text-slate-600 dark:text-gray-400 mb-4">{post.excerpt}</p>
                                    <div className="flex justify-between items-center text-sm text-slate-500 dark:text-gray-400">
                                        <span>{post.date}</span>
                                        <span className="font-semibold hover:text-primary">Read More &rarr;</span>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BlogsPage;