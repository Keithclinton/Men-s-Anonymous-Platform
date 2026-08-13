import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { MpesaGateway } from './gateways/mpesa.gateway';
import { PAYMENT_GATEWAY } from './gateways/payment-gateway.interface';

@Module({
  controllers: [BillingController],
  providers: [
    BillingService,
    // Swap this binding for PesapalGateway (or a router that picks per-payment) when
    // §11d happens — nothing else in the codebase should need to change.
    { provide: PAYMENT_GATEWAY, useClass: MpesaGateway },
  ],
  exports: [BillingService],
})
export class BillingModule {}
