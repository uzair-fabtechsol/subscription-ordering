import { Request, Response, NextFunction } from "express";
import { WebhookUtilityService } from "../commands/main-account/utils/main-account-util";
import Stripe from "stripe";
import colors from "colors";
import dotenv from "dotenv";
dotenv.config();
interface Command {
  execute(res: Response): Promise<void>;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

const endpointSecret = process.env.END_POINT_SECRET_MAIN_ACCOUNT as string;
import {InvoicePaymentSucceededCommand} from "../commands/main-account/invoice-payment-succeeded-cmd";


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
};

// Dependency container (easy to extend later)
const dependencies = {
  stripe,
  // Email,
  utilityService: WebhookUtilityService,
};

export const handleStripeWebhookMainAccount = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
    console.log("🚀 ~ file: main-account-controller.ts:41 ~ handleStripeWebhookMainAccount ~ req.body:")
  console.log("john")


  const sig = req.headers["stripe-signature"] as string | undefined;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
console.log("🚀 ~ file: main-account-controller.ts:54 ~ handleStripeWebhookMainAccount ~ event:", event)
  const CommandClass = commandRegistry[event.type];

  if (!CommandClass) {
    console.log(`Unhandled event type ${event.type}`);
    return res.status(200).send();
  }

  try {
    const command = new CommandClass(event, dependencies);
    await command.execute(res);

    if (!res.headersSent) {
      res.status(200).send("Success");
    }
  } catch (error: any) {
    console.error(`Error processing ${event.type}: ${error.message}`);
    return res.status(500).send(`Webhook Error: ${error.message}`);
  }
};
