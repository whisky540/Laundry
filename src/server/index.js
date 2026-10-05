const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const crypto = require('crypto');

const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY?.trim() || '';
const firebasePrivateKey = rawPrivateKey
  .replace(/^["']|["',]+$/g, '')
  .replace(/^["']|["',]+$/g, '')
  .replace(/\\n/g, '\n')
  .trim();

if (!firebasePrivateKey || firebasePrivateKey.length < 500) {
  throw new Error(
    'FIREBASE_PRIVATE_KEY is missing or truncated. Set it to the private_key value from a Firebase Admin SDK service-account JSON file.',
  );
}

admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: firebasePrivateKey,
  }),
});

const db = admin.firestore();
const app = express();
app.use(cors());

// IMPORTANT: raw body for webhook signature verification
app.use('/paychangu-webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

const PAYCHANGU_BASE = 'https://api.paychangu.com';
const SECRET_KEY = process.env.PAYCHANGU_SECRET_KEY;
const WEBHOOK_SECRET = process.env.PAYCHANGU_WEBHOOK_SECRET;

const verifyPayChanguTransaction = async (txRef, expectedOrder) => {
  const response = await fetch(
    `${PAYCHANGU_BASE}/verify-payment/${encodeURIComponent(txRef)}`,
    {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${SECRET_KEY}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`PayChangu verification failed with ${response.status}`);
  }

  const result = await response.json();
  const verified = result.data?.data || result.data;
  const isSuccessful = ['success', 'successful'].includes(
    String(verified?.status || '').toLowerCase(),
  );

  return Boolean(
    isSuccessful &&
      verified.tx_ref === txRef &&
      String(verified.currency || '').toUpperCase() === 'MWK' &&
      Number(verified.amount) === Number(expectedOrder.total),
  );
};

// ─────────────────────────────────────────────
// 1. Create a checkout session
// ─────────────────────────────────────────────
app.post('/create-checkout-session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'Missing auth token' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const uid = decoded.uid;

    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

    // Load and validate the order
    const orderRef = db.collection('orders').doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return res.status(404).json({ error: 'Order not found' });

    const order = orderSnap.data();
    if (order.customerId !== uid) return res.status(403).json({ error: 'Not your order' });
    if (order.paymentStatus === 'Paid') return res.status(409).json({ error: 'Already paid' });
    if (!order.adminConfirmedAt) return res.status(409).json({ error: 'Order not confirmed yet' });

    // Generate a unique transaction reference
    const txRef = `order_${orderId}_${Date.now()}`;

    // Call PayChangu Standard Checkout
    const response = await fetch(`${PAYCHANGU_BASE}/payment`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: String(Math.round(order.total)),
        currency: 'MWK',
        email: decoded.email || '',
        first_name: order.customerFirstName || '',
        last_name: order.customerLastName || '',
        callback_url: `${process.env.BASE_URL}/paychangu-webhook`,
        return_url: `${process.env.BASE_URL}/payment-return`,
        tx_ref: txRef,
        customization: {
          title: 'Laundry Payment',
          description: order.serviceName || 'Laundry service',
        },
        meta: { orderId, uid },
      }),
    });

    const data = await response.json();

    if (data.status !== 'success' || !data.data?.checkout_url) {
      console.error('PayChangu error:', data);
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }

    // Save the tx_ref and checkout_url so we can match the webhook later
    await orderRef.update({
      paychanguTxRef: txRef,
      paychanguCheckoutUrl: data.data.checkout_url,
      paymentStatus: 'Pending',
    });

    res.json({
      checkoutUrl: data.data.checkout_url,
      txRef,
    });
  } catch (err) {
    console.error('create-checkout-session error:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ─────────────────────────────────────────────
// 2. Webhook — PayChangu notifies you of payment
// ─────────────────────────────────────────────
app.post('/paychangu-webhook', async (req, res) => {
  try {
    if (!WEBHOOK_SECRET) {
      console.error('PayChangu webhook secret is not configured');
      return res.status(503).json({ error: 'Webhook verification is not configured' });
    }

    const rawPayload = req.body.toString();
    const signature = req.get('Signature');
    if (!signature) return res.status(401).json({ error: 'Missing signature' });

    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(rawPayload)
      .digest();
    const providedSignature = Buffer.from(signature, 'hex');

    if (
      providedSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(providedSignature, expectedSignature)
    ) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const payload = JSON.parse(rawPayload);
    const txRef = payload.tx_ref || payload.data?.tx_ref || payload.reference;
    const status = String(payload.status || payload.data?.status || '').toLowerCase();
    const chargeId = payload.charge_id || payload.data?.charge_id || null;

    if (!txRef) return res.status(200).json({ received: true, ignored: true });

    // Find the order by tx_ref
    const ordersSnap = await db.collection('orders')
      .where('paychanguTxRef', '==', txRef)
      .limit(1)
      .get();

    if (ordersSnap.empty) {
      console.warn('No order found for PayChangu transaction reference');
      return res.status(200).json({ received: true, ignored: true });
    }

    const orderDoc = ordersSnap.docs[0];
    const order = orderDoc.data();

    if (['success', 'successful'].includes(status)) {
      const paymentVerified = await verifyPayChanguTransaction(txRef, order);
      if (!paymentVerified) {
        console.error(`PayChangu verification did not match order ${orderDoc.id}`);
        return res.status(400).json({ error: 'Payment verification failed' });
      }

      await orderDoc.ref.update({
        paymentStatus: 'Paid',
        paymentMethod: 'PayChangu',
        paidAt: new Date().toISOString(),
        paychanguChargeId: chargeId,
        paychanguAmount: order.total,
        paychanguCurrency: 'MWK',
      });
      console.log(`Verified PayChangu payment recorded for order ${orderDoc.id}`);
    } else {
      await orderDoc.ref.update({
        paymentStatus: 'Failed',
        paychanguStatus: status,
      });
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ─────────────────────────────────────────────
// 3. Payment return URL (user redirected here after WebView)
// ─────────────────────────────────────────────
app.get('/payment-return', (req, res) => {
  const { tx_ref, status } = req.query;
  // This is a fallback; the app will poll the order status.
  // You can serve a simple HTML page that closes the WebView.
  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding: 40px;">
        <h2>${status === 'success' ? 'Payment Successful' : 'Payment Cancelled'}</h2>
        <p>You can close this window and return to the app.</p>
      </body>
    </html>
  `);
});

// ─────────────────────────────────────────────
// 4. Verify a PayChangu transaction for the authenticated customer
// ─────────────────────────────────────────────
app.get('/verify-payment/:txRef', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'Missing auth token' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const { txRef } = req.params;
    const ordersSnap = await db.collection('orders')
      .where('paychanguTxRef', '==', txRef)
      .limit(1)
      .get();
    if (ordersSnap.empty) return res.status(404).json({ error: 'Order not found' });

    const orderDoc = ordersSnap.docs[0];
    const order = orderDoc.data();
    if (order.customerId !== decoded.uid) return res.status(403).json({ error: 'Not your order' });

    const verified = await verifyPayChanguTransaction(txRef, order);
    if (verified && order.paymentStatus !== 'Paid') {
      await orderDoc.ref.update({
        paymentStatus: 'Paid',
        paymentMethod: 'PayChangu',
        paidAt: new Date().toISOString(),
        paychanguAmount: order.total,
        paychanguCurrency: 'MWK',
      });
    }

    return res.json({ paymentStatus: verified ? 'Paid' : order.paymentStatus || 'Pending' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// 5. Check order payment status (for app polling)
// ─────────────────────────────────────────────
app.get('/order-status/:orderId', async (req, res) => {
  try {
    const authHeader = req.headers.authorization || '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: 'Missing auth token' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    const orderSnap = await db.collection('orders').doc(req.params.orderId).get();

    if (!orderSnap.exists) return res.status(404).json({ error: 'Not found' });

    const order = orderSnap.data();
    if (order.customerId !== decoded.uid) return res.status(403).json({ error: 'Not your order' });

    res.json({
      paymentStatus: order.paymentStatus || 'Unpaid',
      paidAt: order.paidAt || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = Number(process.env.PORT) || 4242;
app.listen(port, '0.0.0.0', () => {
  console.log(`PayChangu server running on http://0.0.0.0:${port}`);
});