import { WebhookCommand } from "./utils/webhook-command";

import Stripe from "stripe";

export class AccountUpdatedCommand extends WebhookCommand {
  async execute(): Promise<void> {
    const account = this.event.data.object as Stripe.Account;

    console.log("Connected account updated:", account);

    const isOnboardingComplete =
      account.charges_enabled &&
      account.payouts_enabled &&
      (account.requirements?.currently_due?.length ?? 0) === 0 &&
      !account.requirements?.disabled_reason;

    // Update DB with latest account state
    // await db.connectedAccounts.update(account.id, {
    //   chargesEnabled: account.charges_enabled,
    //   payoutsEnabled: account.payouts_enabled,
    //   onboardingComplete: isOnboardingComplete,
    //   requirementsDue: account.requirements?.currently_due ?? [],
    // });
  }
}
