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

export async function createConnectAccount(
  email: string,
  country = "US"
): Promise<string> {
  const account = await stripe.accounts.create({
    type: "express",
    country,
    email,
    capabilities: {
      transfers: { requested: true },
      card_payments: { requested: true },
    },
  });

  return account.id; // store this in your DB
}

/**
 * Generate an onboarding link for an existing Connect account
 */
export async function generateOnboardingLink(accountId: string): Promise<string> {
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: "https://your-app.com/reauth", // update with your frontend route
    return_url: "https://your-app.com/success", // update with your frontend route
    type: "account_onboarding",
  });

  return accountLink.url;
}

/**
 * Check if a Connect account is fully onboarded and payouts are enabled
 */
export async function checkAccountStatus(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);

  return {
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
  };
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
