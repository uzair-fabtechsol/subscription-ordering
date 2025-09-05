import { Request, Response, NextFunction } from "express";
import { WebhookUtilityService } from "../commands/connected-account/utils/connected-account-util";
import Stripe from "stripe";
import colors from "colors";
interface Command {
  execute(res: Response): Promise<void>;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const endpointSecret = process.env.END_POINT_SECRET_CONNECTED_ACCOUNT as string;

import {InvoicePaymentSucceededCommand} from "../commands/connected-account/invoice-payment-succeeded-cmd";


const commandRegistry: Record<string, new (event: Stripe.Event, deps: any) => Command> = {
  "invoice.payment_succeeded": InvoicePaymentSucceededCommand,
//   "invoice.payment_failed": InvoicePaymentFailedCommand,
//   "customer.subscription.deleted": SubscriptionDeletedCommand,
//   "customer.updated": CustomerUpdatedCommand,
//   "checkout.session.completed": CheckoutSessionCompletedCommand,
//   "checkout.session.async_payment_succeeded": AsyncPaymentSucceededCommand,
//   "payment_intent.succeeded": PaymentIntentSucceededCommand,
//   "payment_intent.payment_failed": PaymentIntentFailedCommand,
//   "payment_method.attached": PaymentMethodAttatchedCommand,

// "person.created": require("../commands/connected-account-commands/PersonCreatedCommand"),
// "account.created": require("../commands/connected-account-commands/AccountCreatedCommand"),
// "capability.updated": require("../commands/connected-account-commands/CapabilityUpdatedCommand"),
// "account.updated": require("../commands/connected-account-commands/AccountUpdatedCommand"),
// "customer.updated": require("../commands/connected-account-commands/customerCommands/CustomerUpdatedCommand")
};

// Dependency container (easy to extend later)
const dependencies = {
  stripe,
  // Email,
  utilityService: WebhookUtilityService,
};

export const handleStripeWebhookConnectedAccount = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {

  const sig = req.headers["stripe-signature"] as string | undefined;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const CommandClass = commandRegistry[event.type];

  if (!CommandClass) {
    console.log(`Unhandled event type ${event.type}`);
    return res.status(200).send();
  }

  try {
    const command = new CommandClass(event, dependencies);
    await command.execute(res);

    if (!res.headersSent) {
      res.status(200).send();
    }
  } catch (error: any) {
    console.error(`Error processing ${event.type}: ${error.message}`);
    return res.status(500).send(`Webhook Error: ${error.message}`);
  }
};
