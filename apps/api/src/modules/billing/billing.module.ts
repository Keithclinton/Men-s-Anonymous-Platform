import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { MockPaymentGateway } from './gateways/mock.gateway';
import { MpesaGateway } from './gateways/mpesa.gateway';
import { PAYMENT_GATEWAY } from './gateways/payment-gateway.interface';

const logger = new Logger('BillingModule');

@Module({
  controllers: [BillingController],
  providers: [
    BillingService,
    MpesaGateway,
    MockPaymentGateway,
    // PAYMENTS_MODE=mock swaps in MockPaymentGateway so booking/payment can be tested
    // without real Safaricom Daraja credentials — see gateways/mock.gateway.ts. Defaults
    // to the real gateway unless explicitly opted into mock mode.
    {
      provide: PAYMENT_GATEWAY,
      useFactory: (config: ConfigService, mpesa: MpesaGateway, mock: MockPaymentGateway) => {
        if (config.get('PAYMENTS_MODE') === 'mock') {
          logger.warn(
            'PAYMENTS_MODE=mock — bookings will "pay" instantly with no real M-Pesa charge. Never set this in a real production environment.',
          );
          return mock;
        }
        return mpesa;
      },
      inject: [ConfigService, MpesaGateway, MockPaymentGateway],
    },
  ],
  exports: [BillingService],
})
export class BillingModule {}
