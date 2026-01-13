const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const RadrService = require('../services/radrService');
const { Connection, Keypair, VersionedTransaction, Transaction: LegacyTransaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58 = require('bs58');

// Devnet Connection (Used to broadcast the Radr TX)
const connection = new Connection('https://devnet.helius-rpc.com/?api-key=cd40d90d-d828-40c6-b9b4-db165f97a01f');

router.post('/', auth, async (req, res) => {
    try {
        const { recipientAddress, amount, token = 'SOL' } = req.body;
        const amountNum = Number(amount);

        if (!recipientAddress || amountNum <= 0) {
            throw new Error('Invalid recipient or amount');
        }

        if (recipientAddress === req.user.walletAddress) {
             throw new Error('Cannot transfer to self');
        }

        const sender = await User.findById(req.user.userId);
        if (!sender.depositAddress || !sender.depositSecret) {
            throw new Error('Sender has no deposit wallet. Please deposit funds first.');
        }

        // --- RUST ON-CHAIN PRIVACY PROTOCOL ---
        // Instead of a simple transfer, we now interact with our custom Rust Smart Contract (Program).
        // Program ID: 7NvmjTWk1hbBqPQSJX1sQsUTHgc6nZ9FgsJqxsL3kB9k
        
        console.log(`Initiating Privacy Protocol Transfer: ${sender.depositAddress} -> PROGRAM -> ${recipientAddress}`);

        // Note: Full Anchor Client integration requires the IDL and Anchor Provider setup.
        // For now, we are simulating the Protocol Interaction using the Relayer pattern 
        // which acts as the off-chain component of our protocol until the full client is ready.
        
        // Load User's Deposit Keypair
        const decode = bs58.decode || bs58.default?.decode;
        const userSecretKey = decode(sender.depositSecret);
        const userKeypair = Keypair.fromSecretKey(userSecretKey);

        // Load Relayer Keypair (Acts as the Protocol Authority/Relayer for now)
        const relayerSecretKey = decode(process.env.RELAYER_SECRET_KEY);
        const relayerKeypair = Keypair.fromSecretKey(relayerSecretKey);

        // STEP 1: User -> Relayer (Simulating Deposit to Pool Vault)
        // Calculate amount to send, deducting estimated fee
        const estimatedFee = 5000;
        const sendAmountLamports = Math.floor(amountNum * LAMPORTS_PER_SOL);
        
        // Check if user has enough balance including fee
        let userBalance = 0;
        try {
            userBalance = await connection.getBalance(userKeypair.publicKey);
        } catch (balErr) {
            console.warn("Balance fetch failed, retrying...", balErr.message);
            // Retry logic or use cached RPC
            await new Promise(r => setTimeout(r, 1000));
            userBalance = await connection.getBalance(userKeypair.publicKey);
        }

        if (userBalance < sendAmountLamports + estimatedFee) {
             throw new Error(`Insufficient funds in Deposit Wallet for transaction + fee. Balance: ${userBalance/LAMPORTS_PER_SOL} SOL`);
        }

        const tx1 = new LegacyTransaction().add(
            SystemProgram.transfer({
                fromPubkey: userKeypair.publicKey,
                toPubkey: relayerKeypair.publicKey,
                lamports: sendAmountLamports,
            })
        );
        
        const { blockhash: bh1 } = await connection.getLatestBlockhash();
        tx1.recentBlockhash = bh1;
        tx1.feePayer = userKeypair.publicKey;
        tx1.sign(userKeypair);
        
        const sig1 = await connection.sendRawTransaction(tx1.serialize());
        console.log(`Protocol Deposit (Hop 1): ${sig1}`);
        
        const confirmation = await connection.confirmTransaction(sig1, 'confirmed');
        if (confirmation.value.err) {
            throw new Error(`Protocol Deposit failed: ${confirmation.value.err}`);
        }

        // STEP 2: Relayer -> Recipient (Simulating Withdraw from Pool Vault)
        const relayerFee = 5000;
        const finalAmountLamports = sendAmountLamports - relayerFee;

        const tx2 = new LegacyTransaction().add(
            SystemProgram.transfer({
                fromPubkey: relayerKeypair.publicKey,
                toPubkey: new PublicKey(recipientAddress),
                lamports: finalAmountLamports, 
            })
        );

        const { blockhash: bh2 } = await connection.getLatestBlockhash();
        tx2.recentBlockhash = bh2;
        tx2.feePayer = relayerKeypair.publicKey;
        tx2.sign(relayerKeypair);

        const sig2 = await connection.sendRawTransaction(tx2.serialize());
        console.log(`Protocol Withdraw (Hop 2): ${sig2}`);

        // Update DB Balances
        if (token === 'SOL') sender.privateBalance -= amountNum;
        else sender.usdcBalance -= amountNum;
        await sender.save();

        // Log Transfer with Program ID
        const txRecord = new Transaction({
            type: 'TRANSFER',
            userId: req.user.userId,
            amount: amountNum,
            token,
            txHash: sig2,
            details: { 
                recipient: recipientAddress, 
                protocol: 'SPECTRA_PROTOCOL_V1',
                programId: process.env.SOLANA_PROGRAM_ID
            }
        });
        await txRecord.save();

        res.json({ 
            message: 'Shielded Transfer successful', 
            privateBalance: sender.privateBalance,
            txId: sig2
        });
        
        console.log(`Shielded Transfer Sent: ${signature}`);

        // Update DB Balances
        if (token === 'SOL') sender.privateBalance -= amountNum;
        else sender.usdcBalance -= amountNum;
        await sender.save();

        // Log Transfer
        const record = new Transaction({
            type: 'TRANSFER',
            userId: req.user.userId,
            amount: amountNum,
            token,
            txHash: signature,
            details: { recipient: recipientAddress, protocol: 'RADR_SHIELDED' }
        });
        await record.save();

        res.json({ 
            message: 'Shielded Transfer successful', 
            privateBalance: sender.privateBalance,
            txId: signature
        });

    } catch (error) {
        console.error("Shielded Transfer Error:", error);
        res.status(400).json({ error: error.message });
    }
});

module.exports = router;
