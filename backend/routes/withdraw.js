const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const RadrService = require('../services/radrService');

// Create Unsigned Withdraw Transaction
// Frontend will sign this transaction and submit it to Solana to release funds from Escrow
router.post('/create-tx', auth, async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });

        const user = await User.findById(req.user.userId);
        if (!user) {
             return res.status(404).json({ error: 'User not found' });
        }

        if (user.privateBalance < amount) {
             return res.status(400).json({ error: 'Insufficient private balance' });
        }
        
        // Use the new REAL transaction method
        const txData = await RadrService.createWithdrawTransaction(
            req.user.walletAddress, 
            amount, 
            user.radrApiKey
        );

        res.json({ 
            unsignedTx: txData.unsigned_tx_base64,
            message: 'Please sign this transaction in your wallet'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Notify Backend that withdrawal is complete (Frontend submits TX)
router.post('/notify', auth, async (req, res) => {
    try {
        const { amount, txHash } = req.body;
        
        const user = await User.findById(req.user.userId);
        
        // Double check balance before deducting (though we checked at creation, race condition possible)
        if (user.privateBalance < Number(amount)) {
             return res.status(400).json({ error: 'Insufficient funds' });
        }

        user.privateBalance -= Number(amount);
        await user.save();

        const transaction = new Transaction({
            type: 'WITHDRAW',
            userId: req.user.userId,
            amount: Number(amount),
            token: 'SOL',
            txHash: txHash,
            details: { protocol: 'RADR_ZK_RELAYER' }
        });
        await transaction.save();

        res.json({ message: 'Withdrawal successful', newBalance: user.privateBalance });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
