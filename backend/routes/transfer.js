const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const RadrService = require('../services/radrService');

// POST /api/transfer
// Initiates a ShadowWire "Withdraw to Recipient" transaction (Private Transfer)
router.post('/', auth, async (req, res) => {
    try {
        const { recipientAddress, amount } = req.body;
        const walletAddress = req.user.walletAddress;

        if (!recipientAddress || !amount) {
            return res.status(400).json({ error: 'Recipient address and amount are required' });
        }

        console.log(`Initiating Private Transfer: ${walletAddress} -> ${recipientAddress} (${amount} SOL)`);

        // Use ShadowWire to create a withdraw transaction destined for the recipient
        // This acts as a private transfer since funds come from the shielded pool
        const unsignedTx = await RadrService.createWithdrawTx(walletAddress, amount, recipientAddress);

        res.json({ 
            success: true, 
            message: 'Transfer transaction created',
            unsignedTx // Base64 encoded transaction for frontend to sign
        });

    } catch (error) {
        console.error('Transfer Error:', error);
        res.status(500).json({ error: error.message || 'Transfer failed' });
    }
});

module.exports = router;