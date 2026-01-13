import React, { useState, useEffect } from 'react';
import { Connection, LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram, VersionedTransaction } from '@solana/web3.js';
import axios from 'axios';
import bs58 from 'bs58';
import { Buffer } from 'buffer';

import { 
    LayoutDashboard, 
    Bot, 
    FileText, 
    Settings,
    LogOut,
    User,
    Share2,
    Lock,
    ArrowRight,
    ArrowDown,
    Shield,
    RefreshCw,
    Wallet,
    ShieldCheck,
    Zap,
    Construction,
    X,
    CheckCircle2,
    AlertCircle,
    Copy,
    ExternalLink
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

// Helius RPC URL
const HELIUS_RPC = 'https://devnet.helius-rpc.com/?api-key=cd40d90d-d828-40c6-b9b4-db165f97a01f';
const API_URL = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api';

// Notification Component
const Notification = ({ type, message, onClose }) => {
    const isError = type === 'error';
    return (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-4 p-5 rounded-2xl border backdrop-blur-2xl shadow-[0_0_30px_-10px_rgba(0,0,0,0.5)] animate-in slide-in-from-right-20 duration-500 ${isError ? 'bg-red-500/10 border-red-500/20' : 'bg-green-500/10 border-green-500/20'}`}>
            <div className={`p-2 rounded-full ${isError ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                {isError ? <AlertCircle className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-green-500" />}
            </div>
            <div>
                <h4 className={`text-sm font-bold ${isError ? 'text-red-400' : 'text-green-400'}`}>{isError ? 'Error' : 'Success'}</h4>
                <p className="text-xs text-gray-300 mt-0.5 font-medium">{message}</p>
            </div>
            <button onClick={onClose} className="ml-2 hover:bg-white/10 p-1 rounded-lg transition-colors">
                <X className="w-4 h-4 text-gray-500 hover:text-white" />
            </button>
        </div>
    );
};

const DashboardPage = () => {
    const [walletAddress, setWalletAddress] = useState(null);
    const [balance, setBalance] = useState(null);
    const [notifications, setNotifications] = useState([]);

    const addNotification = (type, message) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, message }]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
    };
  
    // Privacy Layer State
    const [authToken, setAuthToken] = useState(null);
    const [privateBalance, setPrivateBalance] = useState(null);
    const [usdcBalance, setUsdcBalance] = useState(null);
    const [swapAmount, setSwapAmount] = useState('');
    const [swapFrom, setSwapFrom] = useState('SOL');
    const [swapTo, setSwapTo] = useState('USDC');
    const [recipientAddress, setRecipientAddress] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [vaultAmount, setVaultAmount] = useState('');
    
    // Token Selector State
    const [showTokenSelector, setShowTokenSelector] = useState(false);
    const [selectorType, setSelectorType] = useState(null);

    const AVAILABLE_TOKENS = [
        { symbol: 'SOL', name: 'Solana', icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png' },
        { symbol: 'USDC', name: 'USD Coin', icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png' },
        { symbol: 'USDT', name: 'Tether', icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png' },
        { symbol: 'BONK', name: 'Bonk', icon: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I' },
        { symbol: 'WIF', name: 'dogwifhat', icon: 'https://bafkreibk3cvruamzyd4k24r22v4p6y523f2d2566u5g5w3y36776ly5n4e.ipfs.nftstorage.link/' },
        { symbol: 'RAY', name: 'Raydium', icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png' },
        { symbol: 'JUP', name: 'Jupiter', icon: 'https://static.jup.ag/jup/icon.png' },
        { symbol: 'RENDER', name: 'Render', icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof/logo.png' }
    ];

    // Navigation State
    const [activeTab, setActiveTab] = useState('dashboard');
    const [activeModal, setActiveModal] = useState(null);
    const [modalStep, setModalStep] = useState(1);
    const [transactions, setTransactions] = useState([]);

    // Data Fetching
    const fetchTransactions = async (token) => {
        try {
            const res = await axios.get(`${API_URL}/transactions`, { headers: { Authorization: `Bearer ${token}` } });
            setTransactions(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchPrivateBalance = async (token) => {
        try {
            const res = await axios.get(`${API_URL}/balance`, { headers: { Authorization: `Bearer ${token}` } });
            setPrivateBalance(res.data.privateBalance);
            if (res.data.usdcBalance !== undefined) setUsdcBalance(res.data.usdcBalance);
        } catch (err) { console.error(err); }
    };

    // Wallet Logic
    const connectWallet = async () => {
        if (window.phantom?.solana?.isPhantom) {
            try {
                const resp = await window.phantom.solana.connect();
                handleConnect(resp.publicKey);
            } catch (err) { console.error(err); }
        } else {
            window.open('https://phantom.app/', '_blank');
        }
    };

    const handleConnect = async (publicKey) => {
        const pubKeyStr = publicKey.toString();
        setWalletAddress(pubKeyStr);
        localStorage.setItem('walletAddress', pubKeyStr);
        
        try {
            const connection = new Connection(HELIUS_RPC);
            const bal = await connection.getBalance(publicKey);
            setBalance(bal / LAMPORTS_PER_SOL);
        } catch (error) { console.error(error); }

        handleSignMessage(publicKey);
    };

    const handleSignMessage = async (publicKey) => {
        try {
            const address = publicKey.toString();
            const storedToken = localStorage.getItem('authToken');
            const storedWallet = localStorage.getItem('walletAddress');

            if (storedToken && storedWallet === address) {
                 setAuthToken(storedToken);
                 fetchPrivateBalance(storedToken);
                 fetchTransactions(storedToken);
                 return storedToken;
            }

            const message = `Sign this message to authenticate with Spectra Privacy Layer. Wallet: ${address}`;
            const encodedMessage = new TextEncoder().encode(message);
            const signedMessage = await window.phantom.solana.signMessage(encodedMessage, "utf8");
            
            const signature = bs58.encode(signedMessage.signature);
            const res = await axios.post(`${API_URL}/auth`, { walletAddress: address, signature, message });
            
            const token = res.data.token;
            setAuthToken(token);
            localStorage.setItem('authToken', token);
            fetchPrivateBalance(token);
            fetchTransactions(token); 
            return token;
        } catch (err) {
            console.error("Auth failed:", err);
            return null;
        }
    };

    const disconnectWallet = () => {
        setWalletAddress(null);
        setBalance(null);
        setAuthToken(null);
        setPrivateBalance(null);
        localStorage.clear();
        window.phantom?.solana?.disconnect();
    };

    useEffect(() => {
        const provider = window.phantom?.solana;

        const handleAccountChange = (publicKey) => {
            if (publicKey) {
                handleConnect(publicKey);
            } else {
                disconnectWallet();
            }
        };

        if (provider?.isPhantom) {
            // Initial connection check
            const storedWallet = localStorage.getItem('walletAddress');
            if (storedWallet) {
                provider.connect({ onlyIfTrusted: true })
                    .then((resp) => handleConnect(resp.publicKey))
                    .catch(console.error);
            }

            // Event Listeners
            provider.on("disconnect", disconnectWallet);
            provider.on("accountChanged", handleAccountChange);
        }

        return () => {
            if (provider?.isPhantom) {
                provider.off("disconnect", disconnectWallet);
                provider.off("accountChanged", handleAccountChange);
            }
        };
    }, []);

    // Actions
    const handleTransfer = async () => {
        let token = authToken;
        if (!token) {
            if (walletAddress) {
                 token = await handleSignMessage(walletAddress);
                 if (!token) return;
            } else {
                 addNotification('error', "Please connect wallet first");
                 return;
            }
        }

        try {
            await axios.post(`${API_URL}/transfer`, {
                recipientAddress,
                amount: Number(transferAmount)
            }, { headers: { Authorization: `Bearer ${token}` } });
            addNotification('success', "Private Transfer Successful!");
            setRecipientAddress('');
            setTransferAmount('');
            fetchPrivateBalance(token);
            fetchTransactions(token);
        } catch (err) {
            addNotification('error', "Transfer Failed: " + (err.response?.data?.error || err.message));
        }
    };

    const handleSwap = async () => {
        if (!swapAmount || Number(swapAmount) <= 0) return;
        
        let token = authToken;
        if (!token) {
            if (walletAddress) {
                 token = await handleSignMessage(walletAddress);
                 if (!token) return; 
            } else {
                 addNotification('error', "Please connect wallet first");
                 return;
            }
        }
    
        try {
            const txRes = await axios.post(`${API_URL}/swap/create-tx`, {
                amount: Number(swapAmount),
                fromToken: swapFrom,
                toToken: swapTo
            }, { headers: { Authorization: `Bearer ${token}` } });
    
            const { unsignedTx } = txRes.data;
            const transaction = VersionedTransaction.deserialize(Buffer.from(unsignedTx, 'base64'));
            const signed = await window.phantom.solana.signAndSendTransaction(transaction);
            
            await axios.post(`${API_URL}/swap/notify`, {
                amount: Number(swapAmount),
                fromToken: swapFrom,
                toToken: swapTo,
                txHash: signed.signature
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            addNotification('success', "Swap Successful!");
            setSwapAmount('');
            fetchPrivateBalance(token);
            fetchTransactions(token);
        } catch (err) {
            addNotification('error', "Swap Failed: " + (err.response?.data?.error || err.message));
        }
    };

    const confirmDeposit = async () => {
        if (!vaultAmount || Number(vaultAmount) <= 0) return;
        
        let token = authToken;
        if (!token) {
            if (walletAddress) {
                 token = await handleSignMessage(walletAddress);
                 if (!token) return;
            } else {
                 addNotification('error', "Please connect wallet first");
                 return;
            }
        }

        try {
            const txRes = await axios.post(`${API_URL}/deposit/create-tx`, { amount: Number(vaultAmount) }, { headers: { Authorization: `Bearer ${token}` } });
            const { unsignedTx } = txRes.data;
            
            // Use VersionedTransaction for better compatibility
            const transaction = VersionedTransaction.deserialize(Buffer.from(unsignedTx, 'base64'));
            const signed = await window.phantom.solana.signAndSendTransaction(transaction);
            
            await axios.post(`${API_URL}/deposit/notify`, { amount: Number(vaultAmount), txHash: signed.signature }, { headers: { Authorization: `Bearer ${token}` } });
            
            setModalStep(3);
            setVaultAmount('');
            fetchPrivateBalance(token);
            fetchTransactions(token);
            addNotification('success', 'Deposit successful! Funds shielded.');
        } catch (err) {
            console.error("Deposit Error:", err);
            addNotification('error', "Deposit Failed: " + (err.response?.data?.error || err.message));
        }
    };

    const confirmWithdraw = async () => {
        if (!vaultAmount || Number(vaultAmount) <= 0) return;
        if (!recipientAddress) { addNotification('error', "Please enter a destination address"); return; }
        
        let token = authToken;
        if (!token) {
            if (walletAddress) {
                 token = await handleSignMessage(walletAddress);
                 if (!token) return;
            } else {
                 addNotification('error', "Please connect wallet first");
                 return;
            }
        }

        try {
            const txRes = await axios.post(`${API_URL}/withdraw/create-tx`, { amount: Number(vaultAmount), destinationAddress: recipientAddress }, { headers: { Authorization: `Bearer ${token}` } });
            const { unsignedTx } = txRes.data;
            
            // Revert to Transaction.from for Legacy transactions
            const transaction = Transaction.from(Buffer.from(unsignedTx, 'base64'));
            const signed = await window.phantom.solana.signAndSendTransaction(transaction);
            
            await axios.post(`${API_URL}/withdraw/notify`, { amount: Number(vaultAmount), txHash: signed.signature }, { headers: { Authorization: `Bearer ${token}` } });
            
            setModalStep(3);
            setVaultAmount('');
            setRecipientAddress('');
            fetchPrivateBalance(token);
            fetchTransactions(token);
            addNotification('success', 'Withdrawal successful! Funds sent.');
        } catch (err) {
            console.error("Withdraw Error:", err);
            addNotification('error', "Withdrawal Failed: " + (err.response?.data?.error || err.message));
        }
    };

    return (
        <div className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden selection:bg-green-500/30">
            {/* Animated Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-600/5 rounded-full blur-[120px] animate-pulse delay-1000"></div>
            </div>

            {/* Sidebar */}
            <aside className="w-80 border-r border-white/5 flex flex-col justify-between p-6 bg-black/20 backdrop-blur-2xl z-20 relative">
                <div>
                    <div className="flex items-center gap-4 mb-12 px-2 group cursor-pointer">
                        <div className="relative">
                            <div className="absolute inset-0 bg-green-500 blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
                            <img src="https://i.hizliresim.com/852gn2e.png" alt="Spectra" className="w-10 h-10 rounded-xl relative z-10 shadow-xl" />
                        </div>
                        <div>
                            <h1 className="font-bold text-xl tracking-tight text-white">SPECTRA</h1>
                            <span className="text-[10px] tracking-[0.2em] text-green-400 font-bold uppercase">Privacy Protocol</span>
                        </div>
                    </div>

                    <nav className="space-y-2">
                        <NavItem icon={LayoutDashboard} label="DASHBOARD" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                        <NavItem icon={ArrowRight} label="TRANSFER" active={activeTab === 'transfer'} onClick={() => setActiveTab('transfer')} />
                        <NavItem icon={RefreshCw} label="SWAP" active={activeTab === 'swap'} onClick={() => setActiveTab('swap')} />
                        
                        <div className="pt-8 pb-4 px-4">
                            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">Experimental</p>
                        </div>
                        <NavItem icon={Bot} label="SPECTRA AGENT" status="BETA" statusColor="purple" />
                        <NavItem icon={FileText} label="DEVELOPER API" />
                    </nav>
                </div>
                
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <span className="text-xs font-bold text-gray-300">System Operational</span>
                    </div>
                    <p className="text-[10px] text-gray-500">v0.14.3 (Alpha)</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col relative overflow-y-auto z-10 scrollbar-hide">
                <header className="flex justify-between items-center p-8 sticky top-0 z-30 transition-all">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white">
                            {activeTab === 'dashboard' && 'Overview'}
                            {activeTab === 'transfer' && 'Private Transfer'}
                            {activeTab === 'swap' && 'ShadowSwap'}
                        </h2>
                        <p className="text-sm text-gray-500 mt-1 font-medium">Manage your shielded assets securely.</p>
                    </div>
                    
                    {walletAddress ? (
                        <div className="flex items-center gap-4 bg-black/40 border border-white/10 rounded-full p-1.5 pr-6 backdrop-blur-xl">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-green-500 to-emerald-600 p-0.5">
                                <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${walletAddress}`} className="w-full h-full rounded-full bg-black object-cover" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white">{walletAddress.slice(0, 4)}...{walletAddress.slice(-4)}</span>
                                <span className="text-[10px] text-green-400 font-bold">CONNECTED</span>
                            </div>
                            <Button onClick={disconnectWallet} variant="ghost" size="icon" className="w-8 h-8 ml-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white">
                                <LogOut className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <Button onClick={connectWallet} variant="spectra" className="rounded-full px-8 shadow-2xl">Connect Wallet</Button>
                    )}
                </header>

                <div className="flex-1 p-8 pt-0">
                    {!walletAddress ? (
                        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-8 animate-in fade-in zoom-in duration-700">
                            <div className="w-32 h-32 bg-gradient-to-tr from-green-500 to-emerald-600 rounded-[2rem] flex items-center justify-center shadow-[0_0_60px_-10px_rgba(34,197,94,0.5)] mb-8 rotate-3 hover:rotate-0 transition-all duration-500">
                                <ShieldCheck className="w-16 h-16 text-black" />
                            </div>
                            <h1 className="text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400">
                                Privacy Layer 2
                            </h1>
                            <p className="text-xl text-gray-400 max-w-lg leading-relaxed">
                                The ultimate privacy solution for the Solana ecosystem. Shield your assets with zero-knowledge proofs.
                            </p>
                            <Button onClick={connectWallet} variant="spectra" size="lg" className="mt-8 text-lg px-12 h-16 rounded-full">
                                <Wallet className="mr-2 w-5 h-5" /> Connect Wallet
                            </Button>
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {activeTab === 'dashboard' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="md:col-span-2 relative group">
                                        <div className="absolute inset-0 bg-green-500/10 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
                                        <Card className="h-full border-white/10 bg-[#080808]/60 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-12 opacity-5">
                                                <Shield className="w-80 h-80 -mr-20 -mt-20 rotate-12" />
                                            </div>
                                            <CardContent className="p-10 flex flex-col justify-between h-full relative z-10">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/5 backdrop-blur-md">
                                                        <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e]"></div>
                                                        <span className="text-xs font-bold tracking-wider text-white">SHIELDED POOL</span>
                                                    </div>
                                                </div>
                                                <div className="py-8">
                                                    <div className="flex items-baseline gap-3">
                                                        <span className="text-8xl font-mono font-bold text-white tracking-tighter drop-shadow-2xl">
                                                            {privateBalance !== null ? privateBalance.toLocaleString() : '---'}
                                                        </span>
                                                        <span className="text-3xl text-gray-500 font-bold">SOL</span>
                                                    </div>
                                                    <p className="text-base text-gray-500 mt-2 font-mono">? ${(privateBalance * 145).toFixed(2)} USD</p>
                                                </div>
                                                <div className="flex gap-4">
                                                    <Button onClick={() => { setActiveModal('deposit'); setModalStep(1); }} variant="spectra" className="flex-1 h-14 text-base rounded-2xl">Deposit</Button>
                                                    <Button onClick={() => { setActiveModal('withdraw'); setModalStep(1); }} variant="secondary" className="flex-1 h-14 text-base rounded-2xl">Withdraw</Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className="space-y-6">
                                        <Card className="bg-[#080808]/60 border-white/10">
                                            <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-400 font-bold uppercase tracking-widest">Public Wallet</CardTitle></CardHeader>
                                            <CardContent>
                                                <div className="flex items-baseline gap-2 mb-4">
                                                    <span className="text-4xl font-mono font-bold text-white">{balance !== null ? balance.toFixed(4) : '---'}</span>
                                                    <span className="text-sm text-gray-600">SOL</span>
                                                </div>
                                                <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                                                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-xs text-gray-400">Visible on-chain</span></div>
                                                    <ExternalLink className="w-4 h-4 text-gray-600" />
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card className="flex-1 bg-[#080808]/60 border-white/10">
                                            <CardHeader className="pb-4"><CardTitle className="text-sm font-bold text-white">Recent Activity</CardTitle></CardHeader>
                                            <CardContent className="p-0">
                                                {transactions.length > 0 ? (
                                                    <div className="divide-y divide-white/5">
                                                        {transactions.slice(0,3).map((tx) => (
                                                            <div key={tx._id} className="flex justify-between items-center p-4 hover:bg-white/5 transition-colors cursor-pointer">
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`p-2 rounded-lg ${tx.type === 'DEPOSIT' ? 'bg-green-500/10 text-green-500' : tx.type === 'WITHDRAW' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                                                        {tx.type === 'DEPOSIT' ? <ArrowDown className="w-4 h-4" /> : tx.type === 'WITHDRAW' ? <ArrowRight className="w-4 h-4 -rotate-45" /> : <RefreshCw className="w-4 h-4" />}
                                                                    </div>
                                                                    <div><div className="text-sm font-bold text-white">{tx.type}</div><div className="text-[10px] text-gray-500">{new Date(tx.timestamp).toLocaleTimeString()}</div></div>
                                                                </div>
                                                                <div className={`font-mono text-sm font-bold ${tx.type === 'DEPOSIT' ? 'text-green-400' : 'text-white'}`}>{tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-8 text-gray-600 text-xs">No recent activity</div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'transfer' && (
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                                    <div className="lg:col-span-7">
                                        <Card className="h-full bg-[#080808]/80 border-white/10 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-purple-500/5 opacity-50"></div>
                                            <CardHeader><CardTitle className="flex items-center gap-2 text-gray-400 uppercase text-sm tracking-widest"><Share2 className="w-4 h-4" /> Transfer Assets</CardTitle></CardHeader>
                                            <CardContent className="space-y-8 relative z-10 pt-8">
                                                <div className="space-y-4">
                                                    <div className="relative">
                                                        <input type="number" placeholder="0.00" className="w-full bg-transparent border-none text-7xl font-bold text-white placeholder-white/10 focus:ring-0 p-0 font-mono tracking-tighter" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
                                                        <span className="absolute top-1/2 -translate-y-1/2 right-0 text-2xl font-bold text-gray-600 pointer-events-none">SOL</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-sm text-gray-500">Available: {privateBalance || 0} SOL</p>
                                                        <div className="flex gap-2">
                                                            {['25%', '50%', 'MAX'].map(p => <button key={p} onClick={() => setTransferAmount(p === 'MAX' ? privateBalance : privateBalance * (parseInt(p)/100))} className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-gray-400 hover:text-white transition-colors border border-white/5">{p}</button>)}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-gray-400 text-xs font-bold uppercase tracking-widest">Recipient</Label>
                                                    <div className="relative flex items-center bg-black/40 rounded-xl border border-white/10">
                                                        <User className="w-5 h-5 text-gray-500 ml-4" />
                                                        <Input placeholder="Paste Solana address..." className="border-none bg-transparent h-14 pl-3 focus:ring-0 text-sm font-mono" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} />
                                                        <button onClick={async () => { try { const t = await navigator.clipboard.readText(); setRecipientAddress(t); } catch(e){} }} className="pr-4 text-xs font-bold text-green-500 hover:text-green-400 uppercase">PASTE</button>
                                                    </div>
                                                </div>
                                                <Button onClick={handleTransfer} variant="spectra" className="w-full h-16 text-lg rounded-xl mt-4">Confirm Transfer <ArrowRight className="ml-2 w-5 h-5" /></Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className="lg:col-span-5">
                                        <Card className="h-full bg-[#080808]/80 border-white/10 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
                                            <CardHeader><CardTitle className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-green-500" /> Privacy Route</CardTitle></CardHeader>
                                            <CardContent className="flex flex-col gap-8 relative z-10 pl-8 pt-8">
                                                <div className="relative pl-8 pb-8 border-l border-white/10">
                                                    <div className="absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full bg-white border border-black shadow-[0_0_10px_white]"></div>
                                                    <h4 className="text-white font-bold text-sm">You (Shielded)</h4>
                                                    <p className="text-xs text-gray-500 font-mono mt-1">{walletAddress ? walletAddress.slice(0,6)+'...'+walletAddress.slice(-6) : 'Not Connected'}</p>
                                                </div>
                                                <div className="relative pl-8 pb-8 border-l border-dashed border-green-500/50">
                                                    <div className="absolute left-[-16px] top-0 p-1 bg-black border border-green-500 rounded-full shadow-[0_0_15px_rgba(34,197,94,0.3)] animate-pulse"><Zap className="w-4 h-4 text-green-500" /></div>
                                                    <h4 className="text-green-400 font-bold text-sm">Zero-Knowledge Mixer</h4>
                                                    <p className="text-xs text-gray-500 mt-1">Breaking on-chain links via zk-SNARK proof verification.</p>
                                                    <div className="flex gap-2 mt-3"><div className="bg-green-500/10 border border-green-500/20 px-2 py-1 rounded text-[10px] text-green-400 font-mono">PROOF: OK</div></div>
                                                </div>
                                                <div className="relative pl-8">
                                                    <div className={`absolute left-[-5px] top-0 w-2.5 h-2.5 rounded-full border transition-all ${recipientAddress ? 'bg-white border-white shadow-[0_0_10px_white]' : 'bg-gray-800 border-gray-600'}`}></div>
                                                    <h4 className={`font-bold text-sm ${recipientAddress ? 'text-white' : 'text-gray-600'}`}>Recipient</h4>
                                                    <p className="text-xs text-gray-500 font-mono mt-1">{recipientAddress ? recipientAddress.slice(0,6)+'...'+recipientAddress.slice(-6) : 'Waiting for input...'}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'swap' && (
                                <div className="flex justify-center">
                                    <div className="w-full max-w-lg">
                                        <Card className="bg-[#080808]/80 border-white/10 shadow-2xl relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-purple-500/5 opacity-50"></div>
                                            <CardHeader><CardTitle className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center justify-between"><span>Shadow Swap</span><Settings className="w-4 h-4 hover:text-white cursor-pointer" /></CardTitle></CardHeader>
                                            <CardContent className="space-y-4 relative z-10 pt-4">
                                                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                                    <div className="flex justify-between mb-2"><span className="text-xs font-bold text-gray-500 uppercase">Pay</span><span className="text-xs font-bold text-gray-500">Bal: {swapFrom === 'SOL' ? (balance || 0).toFixed(4) : '0.00'}</span></div>
                                                    <div className="flex items-center justify-between">
                                                        <input type="number" placeholder="0.00" className="w-full bg-transparent border-none text-3xl font-bold text-white focus:ring-0 p-0 font-mono tracking-tighter" value={swapAmount} onChange={(e) => setSwapAmount(e.target.value)} />
                                                        <button onClick={() => { setShowTokenSelector(true); setSelectorType('from'); }} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5"><img src={AVAILABLE_TOKENS.find(t => t.symbol === swapFrom)?.icon} className="w-5 h-5 rounded-full" /><span className="font-bold text-white">{swapFrom}</span><ArrowDown className="w-3 h-3 text-gray-500" /></button>
                                                    </div>
                                                </div>
                                                <div className="flex justify-center -my-3 relative z-10"><button className="bg-[#1a1a1a] border border-white/10 p-2 rounded-xl hover:scale-110 transition-transform shadow-lg"><ArrowDown className="w-5 h-5 text-green-500" /></button></div>
                                                <div className="bg-black/40 rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                                                    <div className="flex justify-between mb-2"><span className="text-xs font-bold text-gray-500 uppercase">Receive</span><span className="text-xs font-bold text-gray-500">Bal: {usdcBalance || 0}</span></div>
                                                    <div className="flex items-center justify-between">
                                                        <input type="number" placeholder="0.00" readOnly className="w-full bg-transparent border-none text-3xl font-bold text-white focus:ring-0 p-0 font-mono tracking-tighter opacity-50" value={swapAmount ? (swapAmount * 145).toFixed(2) : ''} />
                                                        <button onClick={() => { setShowTokenSelector(true); setSelectorType('to'); }} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full border border-white/5"><img src={AVAILABLE_TOKENS.find(t => t.symbol === swapTo)?.icon} className="w-5 h-5 rounded-full" /><span className="font-bold text-white">{swapTo}</span><ArrowDown className="w-3 h-3 text-gray-500" /></button>
                                                    </div>
                                                </div>
                                                <Button onClick={handleSwap} variant="spectra" className="w-full h-16 text-lg rounded-xl mt-2">Swap Tokens <RefreshCw className="ml-2 w-5 h-5" /></Button>
                                            </CardContent>
                                        </Card>
                                        <div className="flex justify-center items-center gap-2 mt-6 opacity-50"><span className="text-[10px] text-gray-500 uppercase tracking-widest">Powered by</span><div className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-500" /><span className="text-xs font-bold text-gray-400">RadrLabs</span></div></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* MODALS */}
            {activeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                        <div className="p-6 pb-0 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${activeModal === 'deposit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{activeModal === 'deposit' ? <ArrowDown className="w-5 h-5"/> : <ArrowRight className="-rotate-45 w-5 h-5"/>}</div>
                                {activeModal === 'deposit' ? 'Shield Funds' : 'Withdraw Funds'}
                            </h3>
                            <button onClick={() => { setActiveModal(null); setModalStep(1); setVaultAmount(''); }} className="text-gray-500 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full"><X className="w-4 h-4" /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            {activeModal === 'deposit' && modalStep === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-xl flex items-center gap-3"><ShieldCheck className="w-8 h-8 text-green-500 opacity-80" /><div><p className="text-xs text-green-400 font-bold uppercase tracking-wider">Privacy Mode Active</p><p className="text-[10px] text-gray-400">Funds will be moved to the shielded pool.</p></div></div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between"><Label className="text-gray-400 text-xs font-bold uppercase">Amount (SOL)</Label><span className="text-xs text-gray-500">Bal: {balance?.toFixed(4)}</span></div>
                                        <div className="relative"><Input type="number" placeholder="0.00" className="h-14 text-xl pr-16 font-mono" value={vaultAmount} onChange={(e) => setVaultAmount(e.target.value)} /><button onClick={() => setVaultAmount(balance || 0)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-gray-300">MAX</button></div>
                                    </div>
                                    <Button onClick={confirmDeposit} variant="spectra" className="w-full h-14 text-lg">Confirm Deposit</Button>
                                </div>
                            )}
                            {activeModal === 'withdraw' && modalStep === 1 && (
                                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                    <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl flex items-center gap-3"><ArrowRight className="w-8 h-8 text-red-500 opacity-80 -rotate-45" /><div><p className="text-xs text-red-400 font-bold uppercase tracking-wider">Withdraw to Public</p><p className="text-[10px] text-gray-400">Funds will be visible on-chain.</p></div></div>
                                    <div className="space-y-3">
                                        <div className="flex justify-between"><Label className="text-gray-400 text-xs font-bold uppercase">Amount (SOL)</Label><span className="text-xs text-gray-500">Shielded: {privateBalance}</span></div>
                                        <div className="relative"><Input type="number" placeholder="0.00" className="h-14 text-xl pr-16 font-mono" value={vaultAmount} onChange={(e) => setVaultAmount(e.target.value)} /><button onClick={() => setVaultAmount(privateBalance || 0)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-gray-300">MAX</button></div>
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-gray-400 pl-1 text-xs font-bold uppercase">Destination Address</Label>
                                        <div className="relative"><Input placeholder="Enter wallet address" className="h-14 pr-16 text-sm font-mono" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} /><button onClick={async () => { try { const t = await navigator.clipboard.readText(); setRecipientAddress(t); } catch(e){} }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-green-500 hover:text-green-400 uppercase">PASTE</button></div>
                                    </div>
                                    <Button onClick={confirmWithdraw} variant="destructive" className="w-full h-14 text-lg">Confirm Withdrawal</Button>
                                </div>
                            )}
                            {modalStep === 3 && (
                                <div className="text-center py-8 space-y-6 animate-in zoom-in duration-300">
                                    <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto ring-1 ring-white/10"><CheckCircle2 className="w-12 h-12 text-green-500" /></div>
                                    <div><h4 className="text-2xl font-bold text-white">Transaction Sent</h4><p className="text-gray-400 text-sm mt-2">Your request is being processed.</p></div>
                                    <Button onClick={() => setActiveModal(null)} variant="secondary" className="w-full h-12">Close</Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showTokenSelector && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl relative overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-white">Select Token</h3>
                            <button onClick={() => setShowTokenSelector(false)} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-2 max-h-[400px] overflow-y-auto">
                            {AVAILABLE_TOKENS.map((token) => (
                                <div key={token.symbol} onClick={() => { if (selectorType === 'from') setSwapFrom(token.symbol); else setSwapTo(token.symbol); setShowTokenSelector(false); }} className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-colors group">
                                    <img src={token.icon} className="w-8 h-8 rounded-full" alt={token.name} />
                                    <div className="flex flex-col"><span className="font-bold text-white group-hover:text-green-400 transition-colors">{token.symbol}</span><span className="text-xs text-gray-500">{token.name}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Notifications */}
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
                {notifications.map(n => <div key={n.id} className="pointer-events-auto"><Notification type={n.type} message={n.message} onClose={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} /></div>)}
            </div>
        </div>
    );
};

const NavItem = ({ icon: Icon, label, active, status, statusColor, onClick }) => (
    <div onClick={onClick} className={`flex items-center justify-between px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-200 group ${active ? 'bg-white text-black shadow-lg shadow-white/10 scale-[1.02]' : 'text-gray-500 hover:bg-white/5 hover:text-white hover:pl-5'}`}>
        <div className="flex items-center gap-3"><Icon className={`w-5 h-5 ${active ? 'text-black' : 'group-hover:text-white'}`} /><span className={`text-xs font-bold tracking-widest ${active ? 'text-black' : ''}`}>{label}</span></div>
        {status && <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-wide ${statusColor === 'green' ? 'bg-green-500/20 text-green-400' : statusColor === 'purple' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-400'}`}>{status}</span>}
    </div>
);

export default DashboardPage;
