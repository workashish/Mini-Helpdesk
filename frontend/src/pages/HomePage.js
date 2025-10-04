import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  TicketIcon,
  ClockIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ChatIcon,
  ChartBarIcon,
  ArrowRightIcon,
} from '@heroicons/react/outline';

const HomePage = () => {
  const { user } = useAuth();

  const features = [
    {
      name: 'Smart Ticketing System',
      description: 'Create, manage, and track support tickets with intelligent routing and categorization.',
      icon: TicketIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'SLA Timer Management',
      description: 'Automated SLA tracking with real-time alerts and escalation workflows.',
      icon: ClockIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Role-Based Access',
      description: 'Secure access control with user, agent, and admin role permissions.',
      icon: ShieldCheckIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Threaded Comments',
      description: 'Collaborative communication with threaded discussions and file attachments.',
      icon: ChatIcon,
      color: 'bg-orange-500',
    },
    {
      name: 'Team Collaboration',
      description: 'Multi-agent support with assignment and workload distribution.',
      icon: UserGroupIcon,
      color: 'bg-pink-500',
    },
    {
      name: 'Advanced Analytics',
      description: 'Comprehensive reporting and insights for performance optimization.',
      icon: ChartBarIcon,
      color: 'bg-indigo-500',
    },
  ];

  const stats = [
    { label: 'Average Response Time', value: '< 2 hours', color: 'text-green-600' },
    { label: 'Customer Satisfaction', value: '98.5%', color: 'text-blue-600' },
    { label: 'First Call Resolution', value: '89%', color: 'text-purple-600' },
    { label: 'SLA Compliance', value: '99.2%', color: 'text-orange-600' },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Professional HelpDesk
              <span className="block text-primary-200">Management Platform</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-100 leading-relaxed">
              Streamline your customer support with enterprise-grade ticketing, 
              SLA management, and intelligent automation.
            </p>
            
            {user ? (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/dashboard"
                  className="bg-white text-primary-600 hover:bg-primary-50 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Go to Dashboard
                </Link>
                <Link
                  to="/tickets"
                  className="border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  View Tickets
                </Link>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/register"
                  className="bg-white text-primary-600 hover:bg-primary-50 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg inline-flex items-center justify-center"
                >
                  Get Started
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </Link>
                <Link
                  to="/login"
                  className="border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-16 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className={`text-3xl md:text-4xl font-bold ${stat.color} mb-2`}>
                  {stat.value}
                </div>
                <div className="text-gray-600 text-sm md:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Enterprise-Grade Features
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need to deliver exceptional customer support and maintain high service standards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-100"
              >
                <div className={`${feature.color} w-12 h-12 rounded-lg flex items-center justify-center mb-6`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {feature.name}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Transform Your Support?
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-3xl mx-auto">
              Join thousands of teams who trust our platform to deliver exceptional customer experiences.
            </p>
            
            {!user && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/register"
                  className="bg-white text-primary-600 hover:bg-primary-50 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg inline-flex items-center justify-center"
                >
                  Get Started
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </Link>
                <Link
                  to="/login"
                  className="border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  Sign In
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <TicketIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">HelpDesk Pro</span>
            </div>
            
            <div className="text-gray-400 text-center md:text-right">
              
              <p className="text-sm mt-1">
                Built with React.js & Node.js.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;