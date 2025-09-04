import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config({ quiet: true });
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const stripe = new Stripe(STRIPE_SECRET_KEY);

/**
 * Create a Stripe customer for a new user
 */
export async function createStripeCustomer(
  email: string,
  name: string,
  metadata?: Record<string, string>
) {
  return await stripe.customers.create({
    email,
    name,
    metadata,
  });
}

// ***************************************Frontend Flow (React + Stripe.js)******************************************

// Create SetupIntent

// const { data } = await axios.post("/api/payment/create-setup-intent", { userId });
// const clientSecret = data.clientSecret;

// Confirm Card Setup

// const { setupIntent, error } = await stripe.confirmCardSetup(clientSecret, {
//   payment_method: {
//     card: elements.getElement(CardElement),
//   },
// });

// if (setupIntent?.payment_method) {
//   await axios.post("/api/payment/attach-payment-method", {
//     userId,
//     paymentMethodId: setupIntent.payment_method,
//   });
// }
