// src/commands/connect-account/AccountCreatedCommand.ts
import { WebhookCommand } from "./utils/webhook-command";
import Stripe from "stripe";

export class AccountCreatedCommand extends WebhookCommand {
  async execute(): Promise<void> {
    const account = this.event.data.object as Stripe.Account;

    console.log("Connected account created:", account.id);

    // Example: Save new connected account in DB
    // await db.connectedAccounts.create({ stripeAccountId: account.id });
  }
}
