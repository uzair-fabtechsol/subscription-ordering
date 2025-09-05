import { WebhookCommand } from "./utils/webhook-command";

export class InvoicePaymentSucceededCommand extends WebhookCommand {
  async execute(): Promise<void> {
    const { stripe } = this.dependencies;
    const succeededInvoice = this.event.data.object;

    if (!succeededInvoice.subscription) {
      console.log("No subscription found for invoice.");
      return;
    }

    console.log("Invoice payment succeeded:", succeededInvoice);

  }
}
