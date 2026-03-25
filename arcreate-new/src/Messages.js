import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { messagesAPI, usersAPI, projectsAPI, paymentsAPI, progressAPI, materialsAPI } from './api';
import './Messages.css';

const API_URL = 'http://localhost:5000/api';

const Messages = ({ username, fullName, userRole, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [foremen, setForemen] = useState([]);
  const [clients, setClients] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [projects, setProjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [showChatbot, setShowChatbot] = useState(false);
  const [chatbotMessages, setChatbotMessages] = useState([]);
  const [chatbotInput, setChatbotInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  
  // Chatbot context state
  const [chatbotContext, setChatbotContext] = useState({
    lastTopic: null,
    awaitingResponse: false,
    userPreferences: {},
    conversationHistory: []
  });
  
  // New state for system data
  const [systemData, setSystemData] = useState({
    projects: [],
    payments: [],
    progress: [],
    materials: [],
    tasks: [],
    workers: [],
    safetyIncidents: [],
    documents: []
  });
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const chatbotMessagesEndRef = useRef(null);
  const chatbotInputRef = useRef(null);

  const [stats, setStats] = useState({
    totalConversations: 0,
    unreadCount: 0,
    totalMessages: 0,
    lastActive: null
  });

  useEffect(() => {
    fetchData();
    fetchSystemData();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (showChatbot) {
      scrollChatbotToBottom();
      if (chatbotMessages.length === 0) {
        // Personalized welcome message based on user role
        let welcomeMessage = `Wave Hello ${fullName || username}! I'm your ArCreate AI assistant. `;
        
        if (userRole === 'client') {
          welcomeMessage += `I can help you with:\n• Project progress updates\n• Payment status\n• Invoice information\n• Team contacts\n• Document access\n\nWhat would you like to know?`;
        } else if (userRole === 'foreman') {
          welcomeMessage += `I can help you with:\n• Project tasks\n• Material requests\n• Safety incidents\n• Worker management\n• Daily reports\n\nWhat would you like to know?`;
        } else if (userRole === 'admin') {
          welcomeMessage += `I can help you with:\n• System statistics\n• User activity\n• Project overview\n• Financial summary\n• Inventory status\n\nWhat would you like to know?`;
        }
        
        setChatbotMessages([
          {
            id: 'welcome',
            type: 'bot',
            text: welcomeMessage,
            timestamp: new Date()
          }
        ]);
      }
      setTimeout(() => {
        chatbotInputRef.current?.focus();
      }, 100);
    }
  }, [showChatbot, userRole, fullName, username]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = localStorage.getItem('userId');
      
      const conversationsData = await messagesAPI.getConversations(userId);
      setConversations(conversationsData.conversations || []);
      
      const usersData = await usersAPI.getAll();
      const allUsers = usersData.users || [];
      
      setAdmins(allUsers.filter(u => u.role === 'admin' && u._id !== userId));
      setForemen(allUsers.filter(u => u.role === 'foreman' && u._id !== userId));
      setClients(allUsers.filter(u => u.role === 'client' && u._id !== userId));
      setUsers(allUsers.filter(u => u._id !== userId));
      
      if (userRole === 'admin') {
        const projectsData = await projectsAPI.getAll();
        setProjects(projectsData.projects || []);
      } else if (userRole === 'foreman') {
        const projectsData = await projectsAPI.getByForeman(userId);
        setProjects(projectsData.projects || []);
      } else if (userRole === 'client') {
        const projectsData = await projectsAPI.getByClient(userId);
        setProjects(projectsData.projects || []);
      }
      
      calculateStats(conversationsData.conversations || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all system data for chatbot
  const fetchSystemData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      
      // Fetch projects based on role
      let projectsData = [];
      if (userRole === 'admin') {
        const response = await projectsAPI.getAll();
        projectsData = response.projects || [];
      } else if (userRole === 'foreman') {
        const response = await projectsAPI.getByForeman(userId);
        projectsData = response.projects || [];
      } else if (userRole === 'client') {
        const response = await projectsAPI.getByClient(userId);
        projectsData = response.projects || [];
      }
      
      // Fetch payments for client
      let paymentsData = [];
      if (userRole === 'client') {
        const response = await paymentsAPI.getByClient(userId);
        paymentsData = response.payments || [];
      } else if (userRole === 'admin') {
        const response = await fetch(`${API_URL}/payments/all`);
        const data = await response.json();
        paymentsData = data.payments || [];
      }
      
      // Fetch progress updates
      let progressData = [];
      if (userRole === 'client') {
        const response = await progressAPI.getRecent(userId, 10);
        progressData = response.updates || [];
      } else if (userRole === 'foreman') {
        const projectIds = projectsData.map(p => p.project_id);
        for (const projectId of projectIds) {
          const response = await progressAPI.getByProject(projectId);
          progressData = [...progressData, ...(response.updates || [])];
        }
      }
      
      // Fetch materials/inventory
      const materialsResponse = await materialsAPI.getAll();
      const materialsData = materialsResponse.materials || [];
      
      // Fetch tasks for foreman
      let tasksData = [];
      if (userRole === 'foreman') {
        const response = await fetch(`${API_URL}/tasks/foreman/${userId}`);
        const data = await response.json();
        tasksData = data.tasks || [];
      }
      
      // Fetch workers for foreman
      let workersData = [];
      if (userRole === 'foreman') {
        const response = await fetch(`${API_URL}/workers`);
        const data = await response.json();
        workersData = data.workers || [];
      }
      
      // Fetch safety incidents for foreman
      let safetyData = [];
      if (userRole === 'foreman') {
        const response = await fetch(`${API_URL}/safety/incidents?foreman_id=${userId}`);
        const data = await response.json();
        safetyData = data.incidents || [];
      }
      
      // Fetch documents for client
      let documentsData = [];
      if (userRole === 'client') {
        const response = await fetch(`${API_URL}/documents/client/${userId}`);
        const data = await response.json();
        documentsData = data.documents || [];
      }
      
      setSystemData({
        projects: projectsData,
        payments: paymentsData,
        progress: progressData,
        materials: materialsData,
        tasks: tasksData,
        workers: workersData,
        safetyIncidents: safetyData,
        documents: documentsData
      });
      
    } catch (error) {
      console.error('Error fetching system data for chatbot:', error);
    }
  };

  const calculateStats = (conversationsList) => {
    const totalConversations = conversationsList.length;
    const unreadCount = conversationsList.reduce((sum, c) => sum + (c.unread_count || 0), 0);
    const totalMessages = conversationsList.reduce((sum, c) => sum + (c.message_count || 0), 0);
    const lastActive = conversationsList.length > 0 
      ? conversationsList.sort((a, b) => new Date(b.last_message_date) - new Date(a.last_message_date))[0].last_message_date
      : null;

    setStats({
      totalConversations,
      unreadCount,
      totalMessages,
      lastActive
    });
    setUnreadMessagesCount(unreadCount);
  };

  const fetchMessages = async (conversationId) => {
    try {
      const messagesData = await messagesAPI.getMessages(conversationId);
      setMessages(messagesData.messages || []);
      
      await messagesAPI.markAsRead(conversationId, localStorage.getItem('userId'));
      
      setConversations(prev => prev.map(c => 
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ));
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setShowChatbot(false);

    try {
      const userId = localStorage.getItem('userId');
      await messagesAPI.markAsRead(conversation.id, userId);

      setConversations(prev => prev.map(c =>
        c.id === conversation.id ? { ...c, unread_count: 0 } : c
      ));
      setUnreadMessagesCount(prev => Math.max(0, prev - (conversation.unread_count || 0)));
      fetchMessages(conversation.id);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() && !fileInputRef.current?.files.length) {
      return;
    }

    try {
      const messageData = {
        conversation_id: selectedConversation.id,
        sender_id: localStorage.getItem('userId'),
        sender_name: fullName || username,
        content: newMessage,
        timestamp: new Date().toISOString()
      };

      if (fileInputRef.current?.files.length > 0) {
        messageData.attachment = fileInputRef.current.files[0].name;
      }

      await messagesAPI.sendMessage(messageData);
      
      setMessages(prev => [...prev, {
        ...messageData,
        id: Date.now().toString(),
        is_read: false
      }]);
      
      setNewMessage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      setConversations(prev => prev.map(c => 
        c.id === selectedConversation.id 
          ? { 
              ...c, 
              last_message: newMessage,
              last_message_date: new Date().toISOString(),
              message_count: (c.message_count || 0) + 1
            }
          : c
      ));
      
      scrollToBottom();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to send message'
      });
    }
  };

  const handleStartNewConversation = async () => {
    if (!selectedContact) {
      Swal.fire({
        icon: 'warning',
        title: 'Select Contact',
        text: 'Please select a contact to start a conversation'
      });
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      
      const conversationData = {
        participant1_id: userId,
        participant1_name: fullName || username,
        participant2_id: selectedContact.id,
        participant2_name: selectedContact.name,
        project_id: selectedProject || null,
        user_role: userRole
      };

      const result = await messagesAPI.createConversation(conversationData);
      
      const conversationsData = await messagesAPI.getConversations(userId);
      setConversations(conversationsData.conversations || []);
      
      const newConversation = conversationsData.conversations.find(c => c.id === result.conversation_id);
      if (newConversation) {
        setSelectedConversation(newConversation);
      }
      
      setShowNewMessage(false);
      setSelectedContact(null);
      setSelectedProject('');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to start conversation'
      });
    }
  };

  // Helper function to get time of day
  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Helper function to calculate days left
  const calculateDaysLeft = (endDate) => {
    if (!endDate) return null;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  // Enhanced help message - using string concatenation to avoid Unicode issues
  const getHelpMessage = (role) => {
    if (role === 'admin') {
      return "Search icon What I Can Help You With:\n\n" +
        "Chart Analytics\n" +
        "• \"Show system overview\" - View dashboard statistics\n" +
        "• \"User statistics\" - See user growth and activity\n" +
        "• \"Financial summary\" - Check revenue and payments\n" +
        "• \"Inventory value\" - View total inventory worth\n\n" +
        "Clipboard Management\n" +
        "• \"Active projects\" - List all active projects\n" +
        "• \"Low stock items\" - Check items needing reorder\n" +
        "• \"Foreman performance\" - See foreman statistics\n" +
        "• \"Recent logins\" - View user login activity\n\n" +
        "Lightning Quick Actions\n" +
        "• \"Create user\" - I'll guide you to user management\n" +
        "• \"View reports\" - Access detailed reports\n" +
        "• \"Check alerts\" - Review system alerts\n\n" +
        "Just type what you want to know!";
    } else if (role === 'foreman') {
      return "Search icon What I Can Help You With:\n\n" +
        "Clipboard Tasks & Work\n" +
        "• \"Show my tasks\" - View your pending tasks\n" +
        "• \"Today's work\" - See what needs to be done\n" +
        "• \"Submit daily report\" - Guide for daily reports\n\n" +
        "People Team Management\n" +
        "• \"Show workers\" - List your team members\n" +
        "• \"Workers attendance\" - Track attendance\n" +
        "• \"Equipment status\" - Check available tools\n\n" +
        "Package Materials & Safety\n" +
        "• \"Material requests\" - View request status\n" +
        "• \"Safety incidents\" - Report and view incidents\n" +
        "• \"Low stock alerts\" - Check inventory levels\n\n" +
        "Building Projects\n" +
        "• \"My projects\" - List your assigned projects\n" +
        "• \"Project progress\" - View completion status\n\n" +
        "Just type what you want to know!";
    } else {
      return "Search icon What I Can Help You With:\n\n" +
        "Building Projects\n" +
        "• \"My projects\" - View your construction projects\n" +
        "• \"Project progress\" - Check completion status\n" +
        "• \"Project timeline\" - See schedule and deadlines\n\n" +
        "Money Payments\n" +
        "• \"Payment status\" - Check your balance\n" +
        "• \"Recent invoices\" - View your invoices\n" +
        "• \"Make payment\" - Get payment instructions\n\n" +
        "People Communication\n" +
        "• \"Project team\" - Contact your foreman\n" +
        "• \"Project documents\" - Access files and contracts\n" +
        "• \"Contact support\" - Get help from admin\n\n" +
        "Chart Updates\n" +
        "• \"Latest progress\" - See recent updates\n" +
        "• \"Leave review\" - Share your experience\n\n" +
        "Just type what you want to know!";
    }
  };

  // Enhanced chatbot response generator with real system data
  const generateBotResponse = async (input) => {
    const lowerInput = input.toLowerCase().trim();
    
    // ========== COMMON QUERIES (All Roles) ==========
    
    // Check for greetings
    if (lowerInput.match(/^(hello|hi|hey|greetings|good morning|good afternoon|good evening|hola|howdy)/)) {
      const timeOfDay = getTimeOfDay();
      const name = fullName || username;
      return {
        text: `${timeOfDay}, ${name}! I'm your ArCreate AI assistant. How can I help you today?`,
        context: { lastTopic: 'greeting' }
      };
    }
    
    // Check for thanks
    if (lowerInput.match(/thank|thanks|appreciate|grateful|thx|ty/)) {
      return {
        text: "You're very welcome! Is there anything else I can help you with today?",
        context: { lastTopic: 'thanks' }
      };
    }
    
    // Check for farewell
    if (lowerInput.match(/bye|goodbye|see you|farewell|cya|ttyl/)) {
      return {
        text: `Goodbye! Have a great day, ${fullName || username}! Come back if you need anything else.`,
        context: { lastTopic: 'farewell' }
      };
    }
    
    // Check for help
    if (lowerInput.match(/help|what can you do|features|commands|how to use|guide/)) {
      return {
        text: getHelpMessage(userRole),
        context: { lastTopic: 'help' }
      };
    }
    
    // Check for ArCreate info
    if (lowerInput.match(/what is arcreate|about arcreate|tell me about arcreate|what does arcreate do/)) {
      return {
        text: "About ArCreate\n\nArCreate is a comprehensive Construction Management System designed to streamline construction projects. It provides:\n\n• Project Management\n• Inventory Tracking\n• Team Collaboration\n• Financial Management\n• Safety Compliance\n• Document Management\n\nHow can I assist you with these features today?",
        context: { lastTopic: 'about' }
      };
    }
    
    // Check for contact support
    if (lowerInput.match(/contact support|support|help desk|how to contact|get help/)) {
      return {
        text: "Contact Support\n\nYou can reach our support team through:\n\n• Email: support@arcreate.com\n• Phone: +63 (2) 8123-4567\n• In-app: Use the Messages feature to chat with admin\n\nOur support hours: Monday-Friday, 8:00 AM - 6:00 PM\n\nIs there anything specific I can help you with?",
        context: { lastTopic: 'support' }
      };
    }
    
    // ========== CLIENT-SPECIFIC QUERIES ==========
    if (userRole === 'client') {
      
      // My projects query
      if (lowerInput.includes('my projects') || lowerInput.includes('my project') || lowerInput.includes('list projects')) {
        if (systemData.projects.length === 0) {
          return {
            text: "You don't have any active projects at the moment. Would you like to request a quotation to start your construction journey?",
            context: { lastTopic: 'no_projects' }
          };
        }
        
        let response = "Your Projects:\n\n";
        systemData.projects.forEach(project => {
          const progress = project.progress || 0;
          const status = project.status || 'planning';
          const amount = project.total_contract_amount || 0;
          response += `• ${project.project_name}\n`;
          response += `  Status: ${status}\n`;
          response += `  Progress: ${progress}%\n`;
          response += `  Amount: ₱${amount.toLocaleString()}\n\n`;
        });
        
        return {
          text: response,
          context: { lastTopic: 'my_projects' }
        };
      }
      
      // Project progress query
      if (lowerInput.includes('progress') || lowerInput.includes('update') || lowerInput.includes('how is my project') || lowerInput.includes('status')) {
        if (systemData.projects.length === 0) {
          return {
            text: "You don't have any active projects at the moment. Once you start a project, you'll be able to track progress here.",
            context: { lastTopic: 'no_projects' }
          };
        }
        
        let response = "Project Progress Updates:\n\n";
        systemData.projects.forEach(project => {
          const progress = project.progress || 0;
          const status = project.status || 'planning';
          const startDate = project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not started';
          
          response += `${project.project_name}\n`;
          response += `   Progress: ${progress}% complete\n`;
          response += `   Status: ${status.replace('_', ' ')}\n`;
          response += `   Started: ${startDate}\n`;
          
          // Progress bar visualization
          const barLength = 20;
          const filledBars = Math.floor(progress / 5);
          const emptyBars = barLength - filledBars;
          response += `   [${'█'.repeat(filledBars)}${'░'.repeat(emptyBars)}] ${progress}%\n\n`;
        });
        
        return {
          text: response,
          context: { lastTopic: 'project_progress' }
        };
      }
      
      // Payment status query
      if (lowerInput.includes('payment status') || lowerInput.includes('balance') || lowerInput.includes('how much do i owe') || lowerInput.includes('due') || lowerInput.includes('outstanding')) {
        if (systemData.projects.length === 0) {
          return {
            text: "You don't have any active projects. Once you start a project, payment information will appear here.",
            context: { lastTopic: 'no_projects' }
          };
        }
        
        const totalContract = systemData.projects.reduce((sum, p) => sum + (p.total_contract_amount || 0), 0);
        const totalPaid = systemData.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const balance = totalContract - totalPaid;
        const paidPercentage = totalContract > 0 ? (totalPaid / totalContract) * 100 : 0;
        
        let response = "Payment Summary:\n\n";
        response += `Total Contract Amount: ₱${totalContract.toLocaleString()}\n`;
        response += `Total Paid: ₱${totalPaid.toLocaleString()}\n`;
        response += `Remaining Balance: ₱${balance.toLocaleString()}\n`;
        response += `Payment Progress: ${paidPercentage.toFixed(1)}%\n\n`;
        
        if (balance > 0) {
          response += "Tip: You can make a payment by clicking the 'Make Payment' button on your dashboard.\n\n";
        } else {
          response += "Congratulations! All payments are complete.\n\n";
        }
        
        // Show breakdown by project
        response += "Breakdown by Project:\n";
        systemData.projects.forEach(project => {
          const projectPayments = systemData.payments.filter(p => p.project_id === project.project_id);
          const projectPaid = projectPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          const projectBalance = (project.total_contract_amount || 0) - projectPaid;
          response += `• ${project.project_name}: ₱${projectBalance.toLocaleString()} remaining\n`;
        });
        
        return {
          text: response,
          context: { lastTopic: 'payment_status' }
        };
      }
      
      // Recent invoices query
      if (lowerInput.includes('recent invoices') || lowerInput.includes('invoices') || lowerInput.includes('bills')) {
        if (systemData.payments.length === 0) {
          return {
            text: "You don't have any invoices yet. Invoices will appear here when payments are made.",
            context: { lastTopic: 'no_invoices' }
          };
        }
        
        let response = "Recent Invoices:\n\n";
        systemData.payments.slice(0, 5).forEach((p, index) => {
          const invoiceNumber = `INV-${new Date(p.payment_date).getFullYear()}-${String(index + 1).padStart(4, '0')}`;
          response += `${invoiceNumber}\n`;
          response += `   Project: ${p.project_name || 'General'}\n`;
          response += `   Amount: ₱${p.amount?.toLocaleString()}\n`;
          response += `   Date: ${new Date(p.payment_date).toLocaleDateString()}\n`;
          response += `   Method: ${p.payment_method || 'Cash'}\n\n`;
        });
        
        return {
          text: response,
          context: { lastTopic: 'invoices' }
        };
      }
      
      // Project team query
      if (lowerInput.includes('project team') || lowerInput.includes('team') || lowerInput.includes('foreman') || lowerInput.includes('who is working on my project')) {
        const uniqueForemen = [];
        systemData.projects.forEach(project => {
          if (project.foreman_name && !uniqueForemen.find(f => f.name === project.foreman_name)) {
            uniqueForemen.push({
              name: project.foreman_name,
              project: project.project_name
            });
          }
        });
        
        if (uniqueForemen.length === 0) {
          return {
            text: "No team members have been assigned to your projects yet. The admin will assign a foreman once your project starts.",
            context: { lastTopic: 'no_team' }
          };
        }
        
        let response = "Your Project Team:\n\n";
        uniqueForemen.forEach(foreman => {
          response += `• ${foreman.name} - Site Foreman\n`;
          response += `  Project: ${foreman.project}\n`;
        });
        response += "\nTip: You can message your foreman directly using the 'New Message' button in the Messages section.";
        
        return {
          text: response,
          context: { lastTopic: 'project_team' }
        };
      }
      
      // Project timeline query
      if (lowerInput.includes('timeline') || lowerInput.includes('schedule') || lowerInput.includes('when will it be done') || lowerInput.includes('completion date')) {
        if (systemData.projects.length === 0) {
          return {
            text: "You don't have any active projects. Start by requesting a quotation!",
            context: { lastTopic: 'no_projects' }
          };
        }
        
        let response = "Project Timelines:\n\n";
        systemData.projects.forEach(project => {
          const startDate = project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not scheduled';
          const endDate = project.estimated_end_date ? new Date(project.estimated_end_date).toLocaleDateString() : 'TBD';
          const progress = project.progress || 0;
          
          response += `${project.project_name}\n`;
          response += `   Start: ${startDate}\n`;
          response += `   Target Completion: ${endDate}\n`;
          response += `   Progress: ${progress}%\n`;
          
          if (progress === 100) {
            response += `   Completed!\n`;
          } else if (progress > 0 && project.estimated_end_date) {
            const daysLeft = calculateDaysLeft(project.estimated_end_date);
            if (daysLeft > 0) {
              response += `   Estimated ${daysLeft} days remaining\n`;
            }
          }
          response += `\n`;
        });
        
        return {
          text: response,
          context: { lastTopic: 'timeline' }
        };
      }
      
      // Project documents query
      if (lowerInput.includes('documents') || lowerInput.includes('files') || lowerInput.includes('contract') || lowerInput.includes('blueprint')) {
        const docCount = systemData.documents?.length || 0;
        
        if (docCount === 0) {
          return {
            text: "No documents have been uploaded for your projects yet. Your project team will upload contracts, blueprints, and other documents as needed.",
            context: { lastTopic: 'no_documents' }
          };
        }
        
        let response = "Project Documents:\n\n";
        response += `You have ${docCount} document(s) in your document repository.\n\n`;
        response += "Document Types Available:\n";
        response += "• Contracts\n• Blueprints\n• Permits\n• Invoices\n• Reports\n• Photos\n\n";
        response += "Tip: Go to the 'Documents' section in your dashboard to view and download all project documents.";
        
        return {
          text: response,
          context: { lastTopic: 'documents' }
        };
      }
    }
    
    // ========== FOREMAN-SPECIFIC QUERIES ==========
    if (userRole === 'foreman') {
      
      // Show my tasks query
      if (lowerInput.includes('my tasks') || lowerInput.includes('tasks') || lowerInput.includes('to do') || lowerInput.includes('assignment') || lowerInput.includes('what needs to be done')) {
        if (systemData.tasks.length === 0) {
          return {
            text: "You don't have any tasks assigned yet. You can create tasks through the Task Management section.",
            context: { lastTopic: 'no_tasks' }
          };
        }
        
        const pending = systemData.tasks.filter(t => t.status === 'pending');
        const inProgress = systemData.tasks.filter(t => t.status === 'in_progress');
        const completed = systemData.tasks.filter(t => t.status === 'completed');
        const overdue = systemData.tasks.filter(t => {
          if (t.status !== 'completed' && t.due_date) {
            return new Date(t.due_date) < new Date();
          }
          return false;
        });
        
        let response = "Task Summary:\n\n";
        response += `Completed: ${completed.length}\n`;
        response += `In Progress: ${inProgress.length}\n`;
        response += `Pending: ${pending.length}\n`;
        if (overdue.length > 0) {
          response += `Overdue: ${overdue.length}\n\n`;
        } else {
          response += `\n`;
        }
        
        if (pending.length > 0) {
          response += "Pending Tasks:\n";
          pending.forEach(t => {
            const dueDate = new Date(t.due_date).toLocaleDateString();
            const priorityEmoji = t.priority === 'high' || t.priority === 'urgent' ? 'Red circle' : 'Orange circle';
            response += `${priorityEmoji} ${t.task_name}\n`;
            response += `   Project: ${t.project_name}\n`;
            response += `   Due: ${dueDate}\n`;
          });
          response += `\n`;
        }
        
        if (overdue.length > 0) {
          response += "Overdue Tasks (Need Immediate Attention):\n";
          overdue.forEach(t => {
            response += `• ${t.task_name} - Due: ${new Date(t.due_date).toLocaleDateString()}\n`;
          });
          response += `\n`;
        }
        
        response += `Tip: Go to Task Management to update task status and create new tasks.`;
        
        return {
          text: response,
          context: { lastTopic: 'tasks' }
        };
      }
      
      // Show workers query
      if (lowerInput.includes('show workers') || lowerInput.includes('workers') || lowerInput.includes('staff') || lowerInput.includes('team') || lowerInput.includes('crew')) {
        if (systemData.workers.length === 0) {
          return {
            text: "You haven't added any workers yet. Go to Workers Management to add workers to your team.",
            context: { lastTopic: 'no_workers' }
          };
        }
        
        const active = systemData.workers.filter(w => w.status === 'active');
        const inactive = systemData.workers.filter(w => w.status === 'inactive');
        const totalDailyCost = active.reduce((sum, w) => sum + (w.daily_rate || 0), 0);
        
        let response = "Workers Management:\n\n";
        response += `Total Workers: ${systemData.workers.length}\n`;
        response += `Active: ${active.length}\n`;
        response += `Inactive: ${inactive.length}\n`;
        response += `Total Daily Cost: ₱${totalDailyCost.toLocaleString()}\n\n`;
        
        if (active.length > 0) {
          response += "Active Workers:\n";
          active.forEach(w => {
            response += `• ${w.full_name}\n`;
            response += `  Position: ${w.position}\n`;
            response += `  Rate: ₱${w.daily_rate?.toLocaleString()}/day\n`;
            if (w.specialty) response += `  Specialty: ${w.specialty}\n`;
            response += `\n`;
          });
        }
        
        response += `Tip: You can manage workers in the Workers Management section. Add new workers or update their status as needed.`;
        
        return {
          text: response,
          context: { lastTopic: 'workers' }
        };
      }
      
      // Material requests query
      if (lowerInput.includes('material requests') || lowerInput.includes('pending requests') || lowerInput.includes('material status')) {
        try {
          const response = await fetch(`${API_URL}/material-requests/foreman/${localStorage.getItem('userId')}`);
          const data = await response.json();
          const requests = data.requests || [];
          
          const pending = requests.filter(r => r.status === 'pending');
          const approved = requests.filter(r => r.status === 'approved');
          const rejected = requests.filter(r => r.status === 'rejected');
          
          let responseText = "Material Requests Summary:\n\n";
          responseText += `Pending: ${pending.length}\n`;
          responseText += `Approved: ${approved.length}\n`;
          responseText += `Rejected: ${rejected.length}\n\n`;
          
          if (pending.length > 0) {
            responseText += "Pending Requests:\n";
            pending.forEach(r => {
              responseText += `• ${r.material_name} - ${r.quantity} ${r.unit}\n`;
              responseText += `  Project: ${r.project_name}\n`;
              responseText += `  Priority: ${r.priority}\n`;
              responseText += `  Needed by: ${new Date(r.required_by).toLocaleDateString()}\n\n`;
            });
          } else if (approved.length > 0) {
            responseText += "Recent Approved Requests:\n";
            approved.slice(0, 3).forEach(r => {
              responseText += `• ${r.material_name} - ${r.quantity} ${r.unit}\n`;
              responseText += `  Approved on: ${new Date(r.processed_at).toLocaleDateString()}\n\n`;
            });
          }
          
          responseText += `Tip: Submit new material requests through the Material Requests section. Approved requests will automatically deduct from inventory.`;
          
          return {
            text: responseText,
            context: { lastTopic: 'material_requests' }
          };
        } catch (error) {
          console.error('Error fetching material requests:', error);
          return {
            text: "Sorry, I couldn't fetch your material requests at the moment. Please try again later.",
            context: { lastTopic: 'error' }
          };
        }
      }
      
      // Safety incidents query
      if (lowerInput.includes('safety incidents') || lowerInput.includes('safety') || lowerInput.includes('incidents') || lowerInput.includes('accidents')) {
        if (systemData.safetyIncidents.length === 0) {
          return {
            text: "No safety incidents reported. Great job keeping the site safe!\n\nRemember to:\n• Always wear proper PPE\n• Report any hazards immediately\n• Conduct regular safety inspections\n• Keep safety equipment accessible\n\nReport any incidents immediately through the Safety section.",
            context: { lastTopic: 'safety_clear' }
          };
        }
        
        const open = systemData.safetyIncidents.filter(i => i.status === 'open');
        const investigating = systemData.safetyIncidents.filter(i => i.status === 'investigating');
        const resolved = systemData.safetyIncidents.filter(i => i.status === 'resolved' || i.status === 'closed');
        
        let response = "Safety Report:\n\n";
        response += `Total Incidents: ${systemData.safetyIncidents.length}\n`;
        response += `Open: ${open.length}\n`;
        response += `Investigating: ${investigating.length}\n`;
        response += `Resolved: ${resolved.length}\n\n`;
        
        if (open.length > 0) {
          response += "Open Incidents:\n";
          open.forEach(i => {
            const date = new Date(i.incident_date).toLocaleDateString();
            response += `• ${i.incident_type} - ${i.severity}\n`;
            response += `  Date: ${date}\n`;
            response += `  Location: ${i.location}\n`;
            if (i.description) {
              response += `  Description: ${i.description.substring(0, 100)}...\n`;
            }
            response += `\n`;
          });
        }
        
        response += `Tip: Report any safety incidents immediately through the Safety section. Always prioritize worker safety.`;
        
        return {
          text: response,
          context: { lastTopic: 'safety' }
        };
      }
      
      // My projects query
      if (lowerInput.includes('my projects') || lowerInput.includes('assigned projects')) {
        if (systemData.projects.length === 0) {
          return {
            text: "You are not assigned to any projects yet. Please contact the admin for project assignments.",
            context: { lastTopic: 'no_projects' }
          };
        }
        
        let response = "My Assigned Projects:\n\n";
        systemData.projects.forEach(project => {
          const progress = project.progress || 0;
          const status = project.status || 'planning';
          response += `• ${project.project_name}\n`;
          response += `  Status: ${status}\n`;
          response += `  Progress: ${progress}%\n`;
          response += `  Client: ${project.client_name || 'Not assigned'}\n\n`;
        });
        
        return {
          text: response,
          context: { lastTopic: 'my_projects' }
        };
      }
      
      // Submit daily report query
      if (lowerInput.includes('daily report') || lowerInput.includes('submit report') || lowerInput.includes('how to submit')) {
        return {
          text: "How to Submit a Daily Report:\n\n" +
            "1. Go to 'Daily Reports' section from your dashboard\n" +
            "2. Click 'New Daily Report'\n" +
            "3. Fill in all required information:\n" +
            "   • Work completed today\n" +
            "   • Materials used\n" +
            "   • Workers present\n" +
            "   • Hours worked\n" +
            "   • Issues encountered\n" +
            "   • Weather conditions\n" +
            "4. Submit the report\n\n" +
            "Tip: Submit daily reports at the end of each shift to maintain accurate project records.",
          context: { lastTopic: 'daily_report' }
        };
      }
      
      // Today's work query
      if (lowerInput.includes('today\'s work') || lowerInput.includes('today work') || lowerInput.includes('what to do today')) {
        const today = new Date().toISOString().split('T')[0];
        const todaysTasks = systemData.tasks.filter(t => {
          if (t.due_date && t.status !== 'completed') {
            const dueDate = new Date(t.due_date).toISOString().split('T')[0];
            return dueDate <= today;
          }
          return false;
        });
        
        if (todaysTasks.length === 0) {
          return {
            text: "You don't have any tasks due today. Check your Task Management for upcoming tasks.\n\nTip: Use this time to catch up on pending tasks or plan ahead for the week.",
            context: { lastTopic: 'no_tasks_today' }
          };
        }
        
        let response = "Today's Priority Tasks:\n\n";
        todaysTasks.forEach(t => {
          const priorityEmoji = t.priority === 'urgent' ? 'Lightning' : t.priority === 'high' ? 'Red circle' : 'Orange circle';
          response += `${priorityEmoji} ${t.task_name}\n`;
          response += `   Project: ${t.project_name}\n`;
          response += `   Priority: ${t.priority}\n\n`;
        });
        
        return {
          text: response,
          context: { lastTopic: 'today_work' }
        };
      }
    }
    
    // ========== ADMIN-SPECIFIC QUERIES ==========
    if (userRole === 'admin') {
      
      // System overview query
      if (lowerInput.includes('system overview') || lowerInput.includes('dashboard') || lowerInput.includes('summary')) {
        try {
          const response = await fetch(`${API_URL}/dashboard/admin`);
          const data = await response.json();
          
          if (data.success) {
            const stats = data.stats;
            let responseText = "System Overview:\n\n";
            responseText += "Users:\n";
            responseText += `   Total: ${stats.totalUsers || 0}\n`;
            responseText += `   Clients: ${stats.totalClients || 0}\n`;
            responseText += `   Foremen: ${stats.totalForemen || 0}\n\n`;
            responseText += "Projects:\n";
            responseText += `   Total: ${stats.totalProjects || 0}\n`;
            responseText += `   Active: ${stats.activeProjects || 0}\n\n`;
            responseText += "Financial:\n";
            responseText += `   Total Revenue: ₱${(stats.totalRevenue || 0).toLocaleString()}\n`;
            responseText += `   Inventory Value: ₱${(stats.totalInventoryValue || 0).toLocaleString()}\n\n`;
            responseText += "Alerts:\n";
            responseText += `   Low Stock Items: ${stats.lowStockCount || 0}\n`;
            responseText += `   Pending Requests: ${stats.pendingInquiries || 0}\n`;
            
            return {
              text: responseText,
              context: { lastTopic: 'system_overview' }
            };
          }
        } catch (error) {
          console.error('Error fetching system stats:', error);
        }
      }
      
      // User statistics query
      if (lowerInput.includes('user statistics') || lowerInput.includes('user stats') || lowerInput.includes('user growth')) {
        try {
          const response = await fetch(`${API_URL}/users`);
          const data = await response.json();
          const users = data.users || [];
          
          const roleStats = { admin: 0, foreman: 0, client: 0 };
          users.forEach(u => {
            if (roleStats[u.role] !== undefined) roleStats[u.role]++;
          });
          
          const activeUsers = users.filter(u => u.status === 'active').length;
          const inactiveUsers = users.filter(u => u.status === 'inactive').length;
          
          let responseText = "User Statistics:\n\n";
          responseText += `Total Users: ${users.length}\n`;
          responseText += `Active: ${activeUsers}\n`;
          responseText += `Inactive: ${inactiveUsers}\n\n`;
          responseText += "By Role:\n";
          responseText += `   Admin: ${roleStats.admin}\n`;
          responseText += `   Foreman: ${roleStats.foreman}\n`;
          responseText += `   Client: ${roleStats.client}\n\n`;
          
          const recentUsers = users.slice(0, 5);
          if (recentUsers.length > 0) {
            responseText += "Recent Registrations:\n";
            recentUsers.forEach(u => {
              const date = new Date(u.created_at).toLocaleDateString();
              responseText += `   • ${u.full_name || u.username} (${u.role}) - ${date}\n`;
            });
          }
          
          return {
            text: responseText,
            context: { lastTopic: 'user_stats' }
          };
        } catch (error) {
          console.error('Error fetching user stats:', error);
          return {
            text: "Sorry, I couldn't fetch user statistics at the moment.",
            context: { lastTopic: 'error' }
          };
        }
      }
      
      // Financial summary query
      if (lowerInput.includes('financial summary') || lowerInput.includes('revenue') || lowerInput.includes('financial report')) {
        try {
          const paymentsResponse = await fetch(`${API_URL}/payments/all`);
          const paymentsData = await paymentsResponse.json();
          const payments = paymentsData.payments || [];
          
          const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
          const paymentsByMethod = {};
          
          payments.forEach(p => {
            const method = p.payment_method || 'cash';
            paymentsByMethod[method] = (paymentsByMethod[method] || 0) + (p.amount || 0);
          });
          
          let responseText = "Financial Summary:\n\n";
          responseText += `Total Revenue: ₱${totalRevenue.toLocaleString()}\n`;
          responseText += `Total Transactions: ${payments.length}\n\n`;
          
          if (Object.keys(paymentsByMethod).length > 0) {
            responseText += "Payment Methods:\n";
            Object.entries(paymentsByMethod).forEach(([method, amount]) => {
              const percentage = totalRevenue > 0 ? (amount / totalRevenue) * 100 : 0;
              responseText += `   • ${method.replace('_', ' ')}: ₱${amount.toLocaleString()} (${percentage.toFixed(1)}%)\n`;
            });
          }
          
          return {
            text: responseText,
            context: { lastTopic: 'financial' }
          };
        } catch (error) {
          console.error('Error fetching financial data:', error);
          return {
            text: "Sorry, I couldn't fetch financial data at the moment.",
            context: { lastTopic: 'error' }
          };
        }
      }
      
      // Low stock items query
      if (lowerInput.includes('low stock') || lowerInput.includes('reorder') || lowerInput.includes('inventory alert')) {
        try {
          const response = await fetch(`${API_URL}/materials/low-stock`);
          const data = await response.json();
          const lowStock = data.materials || [];
          
          if (lowStock.length === 0) {
            return {
              text: "All stock levels are good! No items need reordering.",
              context: { lastTopic: 'stock_good' }
            };
          }
          
          const outOfStock = lowStock.filter(m => m.quantity === 0);
          const critical = lowStock.filter(m => m.quantity > 0 && m.quantity <= m.reorder_level);
          const low = lowStock.filter(m => m.quantity > m.reorder_level && m.quantity <= m.min_stock_level);
          
          let responseText = "Inventory Alerts:\n\n";
          
          if (outOfStock.length > 0) {
            responseText += `Out of Stock (${outOfStock.length}):\n`;
            outOfStock.slice(0, 5).forEach(m => {
              responseText += `   • ${m.material_name} - 0 ${m.unit} left\n`;
            });
            if (outOfStock.length > 5) responseText += `   ...and ${outOfStock.length - 5} more\n`;
            responseText += `\n`;
          }
          
          if (critical.length > 0) {
            responseText += `Critical Low (${critical.length}):\n`;
            critical.slice(0, 5).forEach(m => {
              responseText += `   • ${m.material_name} - ${m.quantity} ${m.unit} (Reorder at ${m.reorder_level})\n`;
            });
            if (critical.length > 5) responseText += `   ...and ${critical.length - 5} more\n`;
            responseText += `\n`;
          }
          
          if (low.length > 0) {
            responseText += `Low Stock (${low.length}):\n`;
            low.slice(0, 5).forEach(m => {
              responseText += `   • ${m.material_name} - ${m.quantity} ${m.unit} (Min: ${m.min_stock_level})\n`;
            });
            if (low.length > 5) responseText += `   ...and ${low.length - 5} more\n`;
          }
          
          responseText += `\nAction Required: Review inventory and place orders for critical items.`;
          
          return {
            text: responseText,
            context: { lastTopic: 'low_stock' }
          };
        } catch (error) {
          console.error('Error fetching low stock:', error);
          return {
            text: "Sorry, I couldn't fetch low stock information at the moment.",
            context: { lastTopic: 'error' }
          };
        }
      }
      
      // Active projects query
      if (lowerInput.includes('active projects') || lowerInput.includes('project overview') || lowerInput.includes('all projects')) {
        try {
          const response = await fetch(`${API_URL}/projects`);
          const data = await response.json();
          const projects = data.projects || [];
          
          const byStatus = {
            planning: 0, construction: 0, finishing: 0, completed: 0, on_hold: 0, cancelled: 0
          };
          let totalBudget = 0;
          
          projects.forEach(p => {
            if (byStatus[p.status] !== undefined) byStatus[p.status]++;
            totalBudget += p.total_contract_amount || 0;
          });
          
          let responseText = "Project Overview:\n\n";
          responseText += `Total Projects: ${projects.length}\n`;
          responseText += `Total Budget: ₱${totalBudget.toLocaleString()}\n\n`;
          responseText += "Status Breakdown:\n";
          responseText += `   Planning: ${byStatus.planning}\n`;
          responseText += `   Construction: ${byStatus.construction}\n`;
          responseText += `   Finishing: ${byStatus.finishing}\n`;
          responseText += `   Completed: ${byStatus.completed}\n`;
          responseText += `   On Hold: ${byStatus.on_hold}\n`;
          responseText += `   Cancelled: ${byStatus.cancelled}\n\n`;
          
          const recentProjects = projects.slice(0, 3);
          if (recentProjects.length > 0) {
            responseText += "Recent Projects:\n";
            recentProjects.forEach(p => {
              responseText += `   • ${p.project_name} - ₱${(p.total_contract_amount || 0).toLocaleString()}\n`;
            });
          }
          
          return {
            text: responseText,
            context: { lastTopic: 'projects' }
          };
        } catch (error) {
          console.error('Error fetching projects:', error);
          return {
            text: "Sorry, I couldn't fetch project data at the moment.",
            context: { lastTopic: 'error' }
          };
        }
      }
      
      // Recent logins query
      if (lowerInput.includes('recent logins') || lowerInput.includes('login activity')) {
        try {
          const response = await fetch(`${API_URL}/logs?limit=20`);
          const data = await response.json();
          const logs = data.logs || [];
          const loginLogs = logs.filter(l => l.action === 'LOGIN');
          
          if (loginLogs.length === 0) {
            return {
              text: "No recent login activity found.",
              context: { lastTopic: 'no_logins' }
            };
          }
          
          let responseText = "Recent Login Activity:\n\n";
          loginLogs.slice(0, 10).forEach(log => {
            const date = new Date(log.timestamp).toLocaleString();
            responseText += `• ${log.user_name} (${log.user_role})\n`;
            responseText += `  ${date}\n`;
            if (log.ip_address) responseText += `  IP: ${log.ip_address}\n`;
            responseText += `\n`;
          });
          
          return {
            text: responseText,
            context: { lastTopic: 'logins' }
          };
        } catch (error) {
          console.error('Error fetching logs:', error);
          return {
            text: "Sorry, I couldn't fetch login activity at the moment.",
            context: { lastTopic: 'error' }
          };
        }
      }
      
      // Foreman performance query
      if (lowerInput.includes('foreman performance') || lowerInput.includes('foreman report')) {
        try {
          const usersResponse = await fetch(`${API_URL}/users`);
          const usersData = await usersResponse.json();
          const foremen = usersData.users?.filter(u => u.role === 'foreman') || [];
          
          let responseText = "Foreman Performance:\n\n";
          
          for (const foreman of foremen) {
            const projectsResponse = await fetch(`${API_URL}/projects/foreman/${foreman._id}`);
            const projectsData = await projectsResponse.json();
            const projects = projectsData.projects || [];
            
            const activeProjects = projects.filter(p => p.status !== 'completed').length;
            const completedProjects = projects.filter(p => p.status === 'completed').length;
            const totalBudget = projects.reduce((sum, p) => sum + (p.total_contract_amount || 0), 0);
            
            responseText += `${foreman.full_name || foreman.username}\n`;
            responseText += `   Active Projects: ${activeProjects}\n`;
            responseText += `   Completed: ${completedProjects}\n`;
            responseText += `   Total Budget: ₱${totalBudget.toLocaleString()}\n\n`;
          }
          
          return {
            text: responseText,
            context: { lastTopic: 'foreman_performance' }
          };
        } catch (error) {
          console.error('Error fetching foreman data:', error);
          return {
            text: "Sorry, I couldn't fetch foreman performance data at the moment.",
            context: { lastTopic: 'error' }
          };
        }
      }
      
      // Inventory value query
      if (lowerInput.includes('inventory value') || lowerInput.includes('total inventory')) {
        try {
          const response = await fetch(`${API_URL}/materials`);
          const data = await response.json();
          const materials = data.materials || [];
          
          let totalValue = 0;
          const byCategory = {};
          
          materials.forEach(m => {
            const value = (m.quantity || 0) * (m.unit_price || 0);
            totalValue += value;
            
            if (!byCategory[m.category]) {
              byCategory[m.category] = 0;
            }
            byCategory[m.category] += value;
          });
          
          let responseText = "Inventory Value Analysis:\n\n";
          responseText += `Total Inventory Value: ₱${totalValue.toLocaleString()}\n`;
          responseText += `Total Items: ${materials.length}\n\n`;
          
          responseText += "By Category:\n";
          Object.entries(byCategory).forEach(([category, value]) => {
            const percentage = (value / totalValue) * 100;
            responseText += `   • ${category}: ₱${value.toLocaleString()} (${percentage.toFixed(1)}%)\n`;
          });
          
          return {
            text: responseText,
            context: { lastTopic: 'inventory_value' }
          };
        } catch (error) {
          console.error('Error fetching inventory:', error);
          return {
            text: "Sorry, I couldn't fetch inventory data at the moment.",
            context: { lastTopic: 'error' }
          };
        }
      }
    }
    
    // ========== DEFAULT RESPONSE ==========
    return {
      text: `I'm here to help! Here's what you can ask me:\n\n${getHelpMessage(userRole)}\n\nWhat would you like to know more about?`,
      context: { lastTopic: 'default' }
    };
  };

  const handleChatbotSend = async (e) => {
    e.preventDefault();
    
    if (!chatbotInput.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: chatbotInput,
      timestamp: new Date()
    };
    
    setChatbotMessages(prev => [...prev, userMessage]);
    const userQuestion = chatbotInput;
    setChatbotInput('');
    setIsTyping(true);
    
    scrollChatbotToBottom();
    
    // Simulate typing delay based on question length
    const delay = Math.min(1500, userQuestion.length * 30);
    
    setTimeout(async () => {
      try {
        // If the query is about stats, fetch fresh data
        if (userQuestion.toLowerCase().includes('stat') || 
            userQuestion.toLowerCase().includes('overview') ||
            userQuestion.toLowerCase().includes('summary') ||
            userQuestion.toLowerCase().includes('low stock') ||
            userQuestion.toLowerCase().includes('performance')) {
          await fetchSystemData();
        }
        
        // Now call the generateBotResponse which returns an object with text property
        const result = await generateBotResponse(userQuestion);
        let botResponse = result.text;
        
        // Update chatbot context
        if (result.context) {
          setChatbotContext(prev => ({ 
            ...prev, 
            ...result.context, 
            conversationHistory: [...prev.conversationHistory, { question: userQuestion, response: botResponse }] 
          }));
        }
        
        setChatbotMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'bot',
          text: botResponse,
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error('Error generating bot response:', error);
        setChatbotMessages(prev => [...prev, {
          id: Date.now() + 1,
          type: 'bot',
          text: "Sorry, I encountered an error. Please try again or contact support if the issue persists.",
          timestamp: new Date()
        }]);
      } finally {
        setIsTyping(false);
        scrollChatbotToBottom();
      }
    }, delay);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollChatbotToBottom = () => {
    chatbotMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60 * 1000) {
      return 'Just now';
    } else if (diff < 60 * 60 * 1000) {
      const mins = Math.floor(diff / (60 * 1000));
      return `${mins}m ago`;
    } else if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const getAvailableContacts = () => {
    const currentUserId = localStorage.getItem('userId');
    let availableContacts = [];
    
    if (userRole === 'admin') {
      const foremanContacts = foremen.map(f => ({
        id: f._id,
        name: f.full_name,
        role: 'foreman',
        roleLabel: 'Site Foreman',
        project: null
      }));
      
      const clientContacts = clients.map(c => ({
        id: c._id,
        name: c.full_name,
        role: 'client',
        roleLabel: 'Client',
        project: null
      }));
      
      availableContacts = [...foremanContacts, ...clientContacts];
    } 
    else if (userRole === 'foreman') {
      const adminContacts = admins.map(a => ({
        id: a._id,
        name: a.full_name,
        role: 'admin',
        roleLabel: 'Admin',
        project: null
      }));
      
      const otherForemen = foremen.filter(f => f._id !== currentUserId).map(f => ({
        id: f._id,
        name: f.full_name,
        role: 'foreman',
        roleLabel: 'Site Foreman',
        project: null
      }));
      
      const projectClients = projects
        .filter(p => p.client_id && p.client_id !== currentUserId)
        .map(p => ({
          id: p.client_id,
          name: p.client_name,
          role: 'client',
          roleLabel: 'Client',
          project: p.project_name
        }));
      
      availableContacts = [...adminContacts, ...otherForemen, ...projectClients];
    } 
    else if (userRole === 'client') {
      const adminContacts = admins.map(a => ({
        id: a._id,
        name: a.full_name,
        role: 'admin',
        roleLabel: 'Admin',
        project: null
      }));
      
      const projectForemen = projects
        .filter(p => p.foreman_id && p.foreman_id !== currentUserId)
        .map(p => ({
          id: p.foreman_id,
          name: p.foreman_name,
          role: 'foreman',
          roleLabel: 'Site Foreman',
          project: p.project_name
        }));
      
      availableContacts = [...adminContacts, ...projectForemen];
    }
    
    const uniqueContacts = [];
    const seen = new Set();
    
    for (const contact of availableContacts) {
      if (!seen.has(contact.id)) {
        seen.add(contact.id);
        uniqueContacts.push(contact);
      }
    }
    
    return uniqueContacts.sort((a, b) => a.name.localeCompare(b.name));
  };

  const filteredContacts = getAvailableContacts().filter(contact =>
    contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.roleLabel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.project && contact.project.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getDashboardLink = () => {
    switch(userRole) {
      case 'admin': return '/dashboard-admin';
      case 'foreman': return '/dashboard-foreman';
      case 'client': return '/client-dashboard';
      default: return '/inventory';
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Logout?',
      text: 'Are you sure you want to logout?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#667eea',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Logout'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('token');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        localStorage.removeItem('fullName');
        localStorage.removeItem('userId');
        onLogout();
        navigate('/login');
      }
    });
  };

  // Enhanced suggestion chips based on user role
  const getSuggestionChips = () => {
    const commonChips = [
      { text: "Clipboard Help", query: "help" },
      { text: "Info About ArCreate", query: "what is ArCreate" },
      { text: "Phone Contact Support", query: "how to contact support" }
    ];
    
    if (userRole === 'admin') {
      return [
        { text: "Chart System Overview", query: "show system overview" },
        { text: "People User Statistics", query: "user statistics" },
        { text: "Money Financial Summary", query: "financial summary" },
        { text: "Warning Low Stock Alert", query: "low stock items" },
        { text: "Building Active Projects", query: "active projects" },
        { text: "Trend Up Revenue Report", query: "revenue report" },
        { text: "Lock Recent Logins", query: "recent user logins" },
        { text: "Package Inventory Value", query: "inventory value" },
        { text: "Construction Worker Foreman Performance", query: "foreman performance" },
        ...commonChips
      ];
    } else if (userRole === 'foreman') {
      return [
        { text: "Clipboard My Tasks", query: "show my tasks" },
        { text: "People Workers List", query: "show workers" },
        { text: "Package Pending Requests", query: "material requests" },
        { text: "Warning Safety Incidents", query: "safety incidents" },
        { text: "Building My Projects", query: "my projects" },
        { text: "Chart Today's Work", query: "today's work" },
        { text: "Wrench Equipment Status", query: "equipment status" },
        { text: "Construction Worker Workers Attendance", query: "workers attendance" },
        { text: "Memo Submit Daily Report", query: "how to submit daily report" },
        ...commonChips
      ];
    } else {
      // Client
      return [
        { text: "Building My Projects", query: "my projects" },
        { text: "Money Payment Status", query: "payment status" },
        { text: "Chart Project Progress", query: "project progress" },
        { text: "Page with Curl Recent Invoices", query: "recent invoices" },
        { text: "Construction Worker Project Team", query: "project team" },
        { text: "Calendar Project Timeline", query: "project timeline" },
        { text: "Speech Bubble Contact Foreman", query: "how to contact foreman" },
        { text: "File Folder Project Documents", query: "project documents" },
        { text: "Star Leave a Review", query: "how to leave review" },
        ...commonChips
      ];
    }
  };

  return (
    <div className="messages-container">
      {/* Fixed Header */}
      <div className="messages-fixed-header">
        <div className="header-left">
          <button className="back-btn" onClick={handleBack}>
            <i className="fas fa-arrow-left"></i> Back
          </button>
          <div className="header-logo">
            <img src="/JMJCreations.jpg" alt="ArCreate" />
            <span>Messages</span>
          </div>
        </div>
        
        <div className="header-center">
          <span className="user-greeting">
            Welcome, {fullName || username}!
          </span>
        </div>
        
        <div className="header-right">
          
          <button 
            className={`header-btn chatbot-toggle-btn ${showChatbot ? 'active' : ''}`}
            onClick={() => setShowChatbot(!showChatbot)}
            title={showChatbot ? 'Close Assistant' : 'Ask Assistant'}
          >
            <i className={`fas fa-${showChatbot ? 'times' : 'robot'}`}></i>
            <span className="desktop-only">{showChatbot ? 'Close' : 'Assistant'}</span>
          </button>
          
          <button className="header-btn logout-btn" onClick={handleLogout} title="Logout">
            <i className="fas fa-sign-out-alt"></i>
            <span className="desktop-only">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content with Fixed Header Offset */}
      <div className="messages-main-wrapper">
        {/* Stats Bar - Below Fixed Header */}
        <div className="messages-stats-bar">
          <div className="stat-item">
            <span className="stat-label">Conversations:</span>
            <span className="stat-value">{stats.totalConversations}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Unread:</span>
            <span className="stat-value unread">{stats.unreadCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Messages:</span>
            <span className="stat-value">{stats.totalMessages}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Last Active:</span>
            <span className="stat-value">{stats.lastActive ? formatMessageTime(stats.lastActive) : 'N/A'}</span>
          </div>
        </div>

        {/* Message Area */}
        <div className={`messages-content-area ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {/* Sidebar - always visible but with collapsed mode changes */}
          <div className="messages-sidebar">
            <div className="sidebar-header">
              <h4>{!sidebarCollapsed && 'Conversations'}</h4>
              <div>
                <button 
                  className={`new-message-btn ${showNewMessage ? 'active' : ''}`}
                  onClick={() => {
                    setShowNewMessage(!showNewMessage);
                    if (showNewMessage) {
                      setSelectedContact(null);
                      setSearchTerm('');
                    }
                  }}
                  title={showNewMessage ? "Close New Message Form" : "New Message"}
                >
                  <i className={`fas fa-${showNewMessage ? 'times' : 'plus'}`}></i>
                </button>
                <button 
                  className="sidebar-toggle-btn"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'}`}></i>
                </button>
              </div>
            </div>

            {/* New Message Form - only shows when showNewMessage is true */}
            {showNewMessage && (
              <div className="new-message-form">
                <h5>Start New Conversation</h5>
                
                <div className="form-group">
                  <label>Search Contacts</label>
                  <div className="contact-search">
                    <i className="fas fa-search"></i>
                    <input
                      type="text"
                      placeholder="Search by name or role..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>

                {userRole === 'admin' && (
                  <div className="form-group">
                    <label>Select Project (Optional)</label>
                    <select 
                      value={selectedProject} 
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="project-select"
                    >
                      <option value="">General Conversation</option>
                      {projects.map(project => (
                        <option key={project.project_id} value={project.project_id}>
                          {project.project_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Select Contact</label>
                  <div className="contacts-list" style={{ maxHeight: '200px' }}>
                    {filteredContacts.length > 0 ? (
                      filteredContacts.map(contact => (
                        <div 
                          key={contact.id} 
                          className={`contact-item ${selectedContact?.id === contact.id ? 'selected' : ''}`}
                          onClick={() => setSelectedContact(contact)}
                        >
                          <div className="contact-avatar">
                            {contact.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="contact-info">
                            <span className="contact-name">{contact.name}</span>
                            <span className="contact-role">{contact.roleLabel}</span>
                            {contact.project && (
                              <span className="contact-project">{contact.project}</span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="no-contacts">
                        <p>No contacts found</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={handleStartNewConversation}
                    disabled={!selectedContact}
                  >
                    Start Conversation
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowNewMessage(false);
                      setSelectedContact(null);
                      setSearchTerm('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Conversations List */}
            {!sidebarCollapsed && (
              <div className="conversations-list">
                {loading ? (
                  <div className="loading-spinner">Loading...</div>
                ) : conversations.length > 0 ? (
                  conversations.map(conv => (
                    <div 
                      key={conv.id} 
                      className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''} ${conv.unread_count > 0 ? 'unread' : ''}`}
                      onClick={() => handleSelectConversation(conv)}
                      data-name={conv.participant_name}
                    >
                      <div className="conv-avatar">
                        {conv.participant_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="conv-info">
                        <div className="conv-header">
                          <span className="conv-name">{conv.participant_name}</span>
                          <span className="conv-time">{formatMessageTime(conv.last_message_date)}</span>
                        </div>
                        <div className="conv-last-message">
                          {conv.project_name && (
                            <span className="conv-project">{conv.project_name}</span>
                          )}
                          <span className="conv-message">
                            {conv.last_message?.substring(0, 40)}
                            {conv.last_message?.length > 40 ? '...' : ''}
                          </span>
                        </div>
                        {conv.unread_count > 0 && (
                          <span className="unread-badge">{conv.unread_count}</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-conversations">
                    <i className="fas fa-comments"></i>
                    <p>No conversations yet</p>
                    <button 
                      className="btn btn-primary btn-small"
                      onClick={() => setShowNewMessage(true)}
                    >
                      Start a Conversation
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Main Chat Area */}
          <div className="messages-main">
            {!showChatbot ? (
              <>
                {selectedConversation ? (
                  <div className="conversation-container">
                    {/* Conversation Header */}
                    <div className="conversation-header">
                      <div className="header-info">
                        <div className="header-avatar">
                          {selectedConversation.participant_name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="header-details">
                          <h4>{selectedConversation.participant_name}</h4>
                          {selectedConversation.project_name && (
                            <p className="header-project">{selectedConversation.project_name}</p>
                          )}
                        </div>
                      </div>
                      <div className="header-role">
                        <span className={`role-badge role-${selectedConversation.participant_role || 'user'}`}>
                          {selectedConversation.participant_role === 'admin' ? 'Admin' :
                           selectedConversation.participant_role === 'foreman' ? 'Foreman' : 'Client'}
                        </span>
                      </div>
                    </div>

                    {/* Messages List */}
                    <div className="messages-list-container">
                      <div className="messages-list">
                        {messages.map((message, index) => {
                          const isOwn = message.sender_id === localStorage.getItem('userId');
                          return (
                            <div key={message.id || index} className={`message-item ${isOwn ? 'own' : 'other'}`}>
                              {!isOwn && (
                                <div className="message-avatar">
                                  {message.sender_name?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="message-content">
                                {!isOwn && (
                                  <span className="message-sender">{message.sender_name}</span>
                                )}
                                <div className="message-bubble">
                                  <p>{message.content}</p>
                                  {message.attachment && (
                                    <div className="message-attachment">
                                      <i className="fas fa-paperclip"></i> {message.attachment}
                                    </div>
                                  )}
                                </div>
                                <span className="message-time">
                                  {formatMessageTime(message.timestamp)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </div>
                    </div>

                    {/* Message Input */}
                    <form onSubmit={handleSendMessage} className="message-input-container">
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                      />
                      <button 
                        type="button" 
                        className="attach-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach file"
                      >
                        <i className="fas fa-paperclip"></i>
                      </button>
                      <input
                        type="text"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="message-input"
                      />
                      <button 
                        type="submit" 
                        className="send-btn" 
                        disabled={!newMessage.trim()}
                        title="Send message"
                      >
                        <i className="fas fa-paper-plane"></i>
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="no-conversation-selected">
                    <div className="no-conversation-icon">
                      <i className="fas fa-comment-dots"></i>
                    </div>
                    <h3>Select a conversation</h3>
                    <p>Choose a conversation from the sidebar to start messaging</p>
                  </div>
                )}
              </>
            ) : (
              /* Chatbot Interface */
              <div className="chatbot-container">
                <div className="chatbot-header">
                  <div className="chatbot-header-left">
                    <div className="chatbot-avatar">
                      <i className="fas fa-robot"></i>
                    </div>
                    <div>
                      <h3>ArCreate AI Assistant</h3>
                      <span className="chatbot-status">
                        <i className="fas fa-circle" style={{ color: '#10b981', fontSize: '0.6rem', marginRight: '5px' }}></i>
                        Connected to System • {userRole === 'client' ? 'Client' : userRole === 'foreman' ? 'Foreman' : 'Admin'} Mode
                      </span>
                    </div>
                  </div>
                  <button 
                    className="chatbot-close-btn"
                    onClick={() => setShowChatbot(false)}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                
                <div className="chatbot-messages-container">
                  {chatbotMessages.map(msg => (
                    <div key={msg.id} className={`chatbot-message ${msg.type}`}>
                      {msg.type === 'bot' && (
                        <div className="bot-avatar">
                          <i className="fas fa-robot"></i>
                        </div>
                      )}
                      <div className="message-wrapper">
                        <div className="message-bubble">
                          {msg.text.split('\n').map((line, i) => (
                            <p key={i} style={{ margin: line.startsWith('•') ? '2px 0' : '5px 0' }}>
                              {line.startsWith('•') ? <span style={{ marginRight: '5px' }}>•</span> : null}
                              {line.startsWith('•') ? line.substring(1) : line}
                            </p>
                          ))}
                        </div>
                        <span className="message-time">
                          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="chatbot-message bot">
                      <div className="bot-avatar">
                        <i className="fas fa-robot"></i>
                      </div>
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  )}
                  <div ref={chatbotMessagesEndRef} />
                </div>
                
                <form onSubmit={handleChatbotSend} className="chatbot-input-form">
                  <input
                    type="text"
                    ref={chatbotInputRef}
                    placeholder="Ask me anything about your projects..."
                    value={chatbotInput}
                    onChange={(e) => setChatbotInput(e.target.value)}
                    className="chatbot-input"
                  />
                  <button 
                    type="submit" 
                    className="send-btn" 
                    disabled={!chatbotInput.trim()}
                  >
                    <i className="fas fa-paper-plane"></i>
                  </button>
                </form>
                
                <div className="chatbot-suggestions">
                  <p>Quick questions:</p>
                  <div className="suggestion-chips">
                    {getSuggestionChips().map((chip, index) => (
                      <button 
                        key={index}
                        className="suggestion-chip"
                        onClick={() => setChatbotInput(chip.query)}
                      >
                        {chip.text}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Messages;
