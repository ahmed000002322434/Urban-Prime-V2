
import React, { useState, useEffect } from 'react';
import { useScrollReveal } from '../../hooks/useScrollReveal';
import EmailInput from '../../components/EmailInput';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { adminService } from '../../services/adminService';
import { useNotification } from '../../context/NotificationContext';
import Spinner from '../../components/Spinner';

const FaqItem: React.FC<{ q: string, a: React.ReactNode, defaultOpen?: boolean }> = ({ q, a, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-gray-200 dark:border-gray-700 py-4">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left">
                <span className="font-semibold text-gray-800 dark:text-dark-text">{q}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            {isOpen && <div className="mt-4 text-gray-600 dark:text-gray-400 prose prose-sm max-w-none">{a}</div>}
        </div>
    );
};

const SupportCenterPage: React.FC = () => {
  const formRef = useScrollReveal<HTMLFormElement>();
  const faqRef = useScrollReveal<HTMLDivElement>();
  const { user } = useAuth();
  const { showNotification } = useNotification();

  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [captcha, setCaptcha] = useState({ text: '', userInput: '' });
  const [isLoading, setIsLoading] = useState(false);

  const generateCaptcha = () => {
    const randomString = Math.random().toString(36).substring(2, 8).toUpperCase();
    setCaptcha({ text: randomString, userInput: '' });
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (captcha.userInput !== captcha.text) {
        showNotification("Incorrect CAPTCHA. Please try again.");
        generateCaptcha();
        return;
    }
    setIsLoading(true);
    try {
        await adminService.createSupportQuery(formData.name, formData.email, 'Support Form Inquiry', formData.message, user);
        showNotification("Your message has been sent! We'll get back to you soon.");
        setFormData({ name: '', email: '', message: '' });
        generateCaptcha();
    } catch (error) {
        showNotification("Failed to send message. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-dark-background animate-fade-in-up">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <header className="text-center mb-20">
          <h1 className="text-6xl font-extrabold text-gray-900 dark:text-dark-text font-display">Support Center</h1>
          <p className="mt-4 text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">How can we help you today?</p>
        </header>

        <div className="grid md:grid-cols-5 gap-16 max-w-6xl mx-auto">
            <div ref={faqRef} className="animate-reveal md:col-span-3">
                <h3 className="text-2xl font-bold mb-6 dark:text-dark-text">Frequently Asked Questions</h3>
                <FaqItem q="How does Urban Prime protect me?" a={<p>We offer <Link to="/purchase-protection" className="text-primary hover:underline">Purchase Protection</Link> for eligible orders. This means you can get a full refund if your item doesn’t arrive, is significantly not as described, or is damaged. Visit our <Link to="/safety-center" className="text-primary hover:underline">Safety Center</Link> for more tips.</p>} defaultOpen />
                <FaqItem q="How do I track my order?" a={<p>You can track your order status on the <Link to="/track-order" className="text-primary hover:underline">Track Order page</Link> or from your "My Orders" section in your profile dashboard once you are logged in.</p>} />
                <FaqItem q="What is the return policy?" a={<p>Each seller sets their own return policy. You can find this information on the item's detail page. For a general overview, please see our platform <Link to="/return-policy" className="text-primary hover:underline">Return Policy guidelines</Link>.</p>} />
                <FaqItem q="How can I contact a seller?" a={<p>You can contact a seller directly through the messaging system on our platform. Navigate to the item page and click the "Message Seller" button to start a conversation.</p>} />
            </div>
          <form ref={formRef} onSubmit={handleSubmit} className="animate-reveal space-y-6 md:col-span-2">
            <h3 className="text-2xl font-bold mb-6 dark:text-dark-text">Contact Us</h3>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-dark-surface dark:text-dark-text dark:border-gray-600 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email Address</label>
              <EmailInput
                id="email"
                name="email"
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-dark-surface dark:text-dark-text dark:border-gray-600 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                value={formData.email}
                onChange={(e) => handleChange(e as any)}
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Message</label>
              <textarea id="message" name="message" value={formData.message} onChange={handleChange} rows={5} required className="mt-1 block w-full px-3 py-2 bg-gray-50 dark:bg-dark-surface dark:text-dark-text dark:border-gray-600 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"></textarea>
            </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Security Check</label>
                <div className="flex items-center gap-4 mt-1">
                    <div className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md font-mono text-lg tracking-widest select-none">{captcha.text}</div>
                    <input
                        type="text"
                        placeholder="Enter code"
                        value={captcha.userInput}
                        onChange={(e) => setCaptcha(prev => ({...prev, userInput: e.target.value.toUpperCase()}))}
                        required
                        className="flex-1 px-3 py-2 bg-gray-50 dark:bg-dark-surface dark:text-dark-text dark:border-gray-600 border border-gray-300 rounded-md"
                    />
                </div>
            </div>
            <div>
              <button type="submit" disabled={isLoading} className="w-full py-3 px-4 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity flex justify-center items-center">
                {isLoading ? <Spinner size="sm" /> : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SupportCenterPage;