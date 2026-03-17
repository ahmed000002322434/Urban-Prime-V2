
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { serviceService, providerService } from '../../services/itemService';
import proposalService from '../../services/proposalService';
import type { Service, Job, Proposal } from '../../types';
import Spinner from '../../components/Spinner';
import { motion, AnimatePresence } from 'framer-motion';

// --- Icons ---
const BriefcaseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>;
const CheckCircleIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
const ClockIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>;
const StarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;
const MapPinIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>;

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; subtext?: string; index: number }> = ({ title, value, icon, subtext, index }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.1)" }}
        className="bg-surface/80 backdrop-blur-xl p-6 rounded-2xl shadow-soft border border-border flex items-center gap-4 group"
    >
        <div className="p-3 bg-primary/10 rounded-xl text-primary group-hover:scale-110 transition-transform">{icon}</div>
        <div>
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-widest">{title}</h3>
            <p className="text-2xl font-black text-text-primary">{value}</p>
            {subtext && <p className="text-xs text-green-500 font-bold">{subtext}</p>}
        </div>
    </motion.div>
);

const JobRequestCard: React.FC<{ request: Job; onAccept: () => void; onDecline: () => void }> = ({ request, onAccept, onDecline }) => (
    <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="bg-surface p-6 rounded-2xl shadow-soft border-l-4 border-l-orange-500 border-y border-r border-border hover:shadow-lg transition-all"
    >
        <div className="flex justify-between items-start mb-4">
            <div className="flex gap-4">
                <img src={request.customer?.avatar || '/icons/user-placeholder.svg'} alt={request.customer?.name || 'Customer'} className="w-12 h-12 rounded-full object-cover border-2 border-white dark:border-white/10" />
                <div>
                    <h4 className="font-bold text-lg text-text-primary">{request.service?.title || 'Untitled Service'}</h4>
                    <p className="text-sm text-text-secondary flex items-center gap-1">
                        {request.customer?.name || 'Anonymous'} <span>&middot;</span> <MapPinIcon /> 2.5km away
                    </p>
                </div>
            </div>
            <div className="text-right">
                <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">New Request</span>
                <p className="text-xl font-black text-primary mt-1">${request.price || 0}</p>
            </div>
        </div>
        <div className="bg-surface-soft p-3 rounded-lg mb-4 text-sm text-text-secondary font-mono">
             <p>{request.scheduledTime ? new Date(request.scheduledTime).toLocaleDateString() : 'TBD'} @ {request.scheduledTime ? new Date(request.scheduledTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'TBD'}</p>
        </div>
        <div className="flex gap-3">
            <button onClick={onAccept} className="flex-1 py-2.5 bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:opacity-90 transition-opacity">Accept Job</button>
            <button onClick={onDecline} className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Decline</button>
        </div>
    </motion.div>
);

const ActiveJobCard: React.FC<{ job: Job; onComplete: () => void }> = ({ job, onComplete }) => (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-surface p-6 rounded-2xl shadow-soft border border-border"
    >
         <div className="flex justify-between items-start mb-2">
            <div className="flex gap-3">
                 <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-bold">
                    {job.customer?.name?.charAt(0) || '?'}
                </div>
                <div>
                    <h4 className="font-bold text-text-primary">{job.service?.title || 'Untitled Service'}</h4>
                    <p className="text-sm text-text-secondary">Client: {job.customer?.name || 'Anonymous'}</p>
                </div>
            </div>
            <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-black px-2 py-1 rounded-full uppercase">In Progress</span>
        </div>
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
            <p className="text-sm font-mono text-text-secondary">Due: Today, 5:00 PM</p>
            <button onClick={onComplete} className="px-4 py-1.5 border-2 border-green-500 text-green-600 dark:text-green-400 font-bold text-sm rounded-lg hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors">Mark Complete</button>
        </div>
    </motion.div>
);

const ServiceRow: React.FC<{ service: Service }> = ({ service }) => (
    <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border hover:shadow-md transition-all"
    >
        <div className="flex items-center gap-4">
            <img src={service.imageUrls?.[0] || '/icons/urbanprime.svg'} alt={service.title} className="w-16 h-16 rounded-lg object-cover border border-border" />
            <div>
                <h4 className="font-bold text-text-primary">{service.title || 'Untitled Service'}</h4>
                <p className="text-sm text-text-secondary font-mono">
                    ${(service.pricingModels?.[0]?.price || 0)}/{service.pricingModels?.[0]?.type === 'hourly' ? 'hr' : 'job'}
                </p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Link to={`/service/${service.id}`} className="px-3 py-2 border border-border rounded-lg text-xs font-bold text-text-primary hover:bg-surface-soft transition-colors">Showcase</Link>
            <Link to={`/profile/services/new?edit=${service.id}`} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-bold text-text-primary hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">Edit</Link>
        </div>
    </motion.div>
);

const ProposalRow: React.FC<{ proposal: Proposal }> = ({ proposal }) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -2 }}
        className="p-4 bg-surface rounded-xl border border-border hover:shadow-md transition-all"
    >
        <div className="flex items-start justify-between gap-4">
            <div>
                <p className="text-xs font-black tracking-wider uppercase text-text-secondary">Proposal</p>
                <h4 className="font-bold text-text-primary">{proposal.title || 'Untitled Proposal'}</h4>
                <p className="text-sm text-text-secondary mt-1 line-clamp-2">{proposal.coverLetter || 'No cover letter provided.'}</p>
                <p className="text-sm font-mono text-text-secondary mt-2">
                    ${(proposal.priceTotal || 0).toLocaleString()} {proposal.currency || 'USD'} | {proposal.deliveryDays || 0} days
                </p>
            </div>
            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                proposal.status === 'accepted'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : proposal.status === 'declined'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
            }`}>
                {proposal.status}
            </span>
        </div>
    </motion.div>
);

const ProviderDashboardPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'active' | 'services' | 'proposals'>('overview');
    const [stats, setStats] = useState<any>({ earnings: 0, activeJobs: 0, jobsCompleted: 0, rating: 0 });
    const [requests, setRequests] = useState<Job[]>([]);
    const [activeJobs, setActiveJobs] = useState<Job[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const [statsData, reqs, active, servs, proposalRows] = await Promise.all([
                providerService.getProviderStats(user.id).catch(() => ({ earnings: 0, activeJobs: 0, jobsCompleted: 0, rating: 0 })),
                providerService.getIncomingRequests(user.id).catch(() => []),
                providerService.getActiveJobs(user.id).catch(() => []),
                serviceService.getServicesByProvider(user.id).catch(() => []),
                proposalService.getProviderProposals(user.id).catch(() => [])
            ]);
            setStats(statsData || { earnings: 0, activeJobs: 0, jobsCompleted: 0, rating: 0 });
            setRequests(reqs || []);
            setActiveJobs(active || []);
            setServices(servs || []);
            setProposals(proposalRows || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleAcceptJob = async (jobId: string) => {
        await providerService.updateJobStatus(jobId, 'confirmed');
        fetchData(); // Refresh to move to active
    };

    const handleDeclineJob = async (jobId: string) => {
        await providerService.updateJobStatus(jobId, 'cancelled');
        fetchData();
    };

    if (isLoading) return <div className="h-screen flex items-center justify-center"><Spinner size="lg" /></div>;

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4"
                >
                    <div>
                        <h1 className="text-3xl font-black font-display text-text-primary tracking-tight">Provider Command Center</h1>
                        <p className="text-text-secondary font-medium">Welcome back, {user?.name}. You're online and visible.</p>
                    </div>
                    <div className="flex gap-3">
                        <Link to="/profile/services/new" className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">+ List Service</Link>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <StatCard title="Total Earnings" value={`$${stats.earnings}`} icon={<BriefcaseIcon />} subtext="+12% this week" index={0} />
                    <StatCard title="Active Jobs" value={stats.activeJobs} icon={<ClockIcon />} index={1} />
                    <StatCard title="Jobs Completed" value={stats.jobsCompleted} icon={<CheckCircleIcon />} index={2} />
                    <StatCard title="Rating" value={stats.rating} icon={<StarIcon />} subtext="Top Rated" index={3} />
                </div>

                {/* Tabs */}
                <div className="flex gap-8 border-b border-border mb-8 overflow-x-auto">
                    {['overview', 'requests', 'active', 'services', 'proposals'].map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`pb-3 font-bold text-sm capitalize whitespace-nowrap transition-all border-b-2 ${
                                activeTab === tab 
                                ? 'border-primary text-primary' 
                                : 'border-transparent text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            {tab} {tab === 'requests' && requests.length > 0 && <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-xs ml-1 shadow-sm">{requests.length}</span>}
                            {tab === 'proposals' && proposals.length > 0 && <span className="bg-primary text-white px-2 py-0.5 rounded-full text-xs ml-1 shadow-sm">{proposals.length}</span>}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                    >
                        {activeTab === 'overview' && (
                            <div className="grid lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <h3 className="font-bold text-xl text-text-primary">Incoming Requests</h3>
                                    {requests.length > 0 ? requests.map(req => (
                                        <JobRequestCard key={req.id} request={req} onAccept={() => handleAcceptJob(req.id)} onDecline={() => handleDeclineJob(req.id)} />
                                    )) : <div className="p-8 bg-surface rounded-xl border border-border text-center text-text-secondary italic">No new requests at the moment.</div>}
                                </div>
                                <div className="space-y-6">
                                    <h3 className="font-bold text-xl text-text-primary">Active Jobs</h3>
                                    {activeJobs.length > 0 ? activeJobs.map(job => (
                                        <ActiveJobCard key={job.id} job={job} onComplete={() => {}} />
                                    )) : <div className="p-8 bg-surface rounded-xl border border-border text-center text-text-secondary italic">No active jobs.</div>}
                                </div>
                            </div>
                        )}
                        
                        {activeTab === 'requests' && (
                            <div className="grid md:grid-cols-2 gap-6">
                                 {requests.length > 0 ? requests.map(req => (
                                    <JobRequestCard key={req.id} request={req} onAccept={() => handleAcceptJob(req.id)} onDecline={() => handleDeclineJob(req.id)} />
                                )) : <div className="col-span-2 text-center py-20 text-text-secondary font-medium">No pending requests. Great job!</div>}
                            </div>
                        )}

                        {activeTab === 'services' && (
                            <div className="grid md:grid-cols-2 gap-6">
                                {services.map(service => <ServiceRow key={service.id} service={service} />)}
                                <button onClick={() => navigate('/profile/services/new')} className="flex items-center justify-center p-6 border-2 border-dashed border-border rounded-xl text-text-secondary font-bold hover:border-primary hover:text-primary transition-all h-24 hover:bg-primary/5">
                                    + Add Another Service
                                </button>
                            </div>
                        )}

                        {activeTab === 'proposals' && (
                            <div className="grid md:grid-cols-2 gap-6">
                                {proposals.length > 0 ? proposals.map(proposal => (
                                    <ProposalRow key={proposal.id} proposal={proposal} />
                                )) : (
                                    <div className="col-span-2 text-center py-20 text-text-secondary font-medium">
                                        No proposals yet. Send offers from requests to start closing contracts.
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default ProviderDashboardPage;

