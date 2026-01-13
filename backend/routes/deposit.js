const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { Connection, PublicKey, SystemProgram, Transaction: SolTransaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');

// Devnet Connection
const connection = new Connection('https://devnet.helius-rpc.com/?api-key=cd40d90d-d828-40c6-b9b4-db165f97a01f');

// Create Unsigned Deposit Transaction
// Transfers SOL from User's Wallet -> User's Deposit Address (in DB)
router.post('/create-tx', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found. Please reconnect your wallet.' });
        }

        // Ensure deposit address exists
        if (!user.depositAddress) {
            return res.status(400).json({ error: 'Deposit address not found for this user.' });
        }
        
        console.log(`Creating Deposit TX: ${req.user.walletAddress} -> ${user.depositAddress} (${amount} SOL)`);

        const fromPubkey = new PublicKey(req.user.walletAddress);
        const toPubkey = new PublicKey(user.depositAddress);
        const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

        const transaction = new SolTransaction().add(
            SystemProgram.transfer({
                fromPubkey,
                toPubkey,
                lamports,
            })
        );

        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = fromPubkey;

        const serializedTransaction = transaction.serialize({ requireAllSignatures: false });
        const base64Transaction = serializedTransaction.toString('base64');

        res.json({ 
            unsignedTx: base64Transaction,
            message: 'Please sign this transaction to deposit funds'
        });
    } catch (error) {
        console.error("Create Deposit TX Error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Notify Backend that deposit is complete (After frontend signs & submits)
// In a production app, we would verify the signature on-chain or wait for webhook
router.post('/notify', auth, async (req, res) => {
    try {
        const { amount, txHash } = req.body;
        
        const user = await User.findById(req.user.userId);
        user.privateBalance += Number(amount);
        await user.save();

        const transaction = new Transaction({
            type: 'DEPOSIT',
            userId: req.user.userId,
            amount: Number(amount),
            token: 'SOL',
            txHash: txHash,
            details: { protocol: 'RADR_ESCROW' }
        });
        await transaction.save();

        res.json({ message: 'Deposit recorded successfully', newBalance: user.privateBalance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
