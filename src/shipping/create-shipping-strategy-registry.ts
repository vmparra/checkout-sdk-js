import { RequestSender } from '@bigcommerce/request-sender';
import { getScriptLoader } from '@bigcommerce/script-loader';

import { CheckoutRequestSender, CheckoutStore } from '../checkout';
import { Registry } from '../common/registry';
import { PaymentMethodActionCreator, PaymentMethodRequestSender } from '../payment';
import { AmazonPayScriptLoader } from '../payment/strategies/amazon-pay';
import { RemoteCheckoutActionCreator, RemoteCheckoutRequestSender } from '../remote-checkout';

import ConsignmentActionCreator from './consignment-action-creator';
import ConsignmentRequestSender from './consignment-request-sender';
import { AmazonPayShippingStrategy, DefaultShippingStrategy, GooglePayBraintreeShippingStrategy, ShippingStrategy } from './strategies';

export default function createShippingStrategyRegistry(
    store: CheckoutStore,
    requestSender: RequestSender
): Registry<ShippingStrategy> {
    const registry = new Registry<ShippingStrategy>();
    const checkoutRequestSender = new CheckoutRequestSender(requestSender);
    const consignmentRequestSender = new ConsignmentRequestSender(requestSender);
    const consignmentActionCreator = new ConsignmentActionCreator(consignmentRequestSender, checkoutRequestSender);

    registry.register('amazon', () =>
        new AmazonPayShippingStrategy(
            store,
            consignmentActionCreator,
            new PaymentMethodActionCreator(new PaymentMethodRequestSender(requestSender)),
            new RemoteCheckoutActionCreator(new RemoteCheckoutRequestSender(requestSender)),
            new AmazonPayScriptLoader(getScriptLoader())
        )
    );

    registry.register('googlepaybraintree', () =>
        new GooglePayBraintreeShippingStrategy(
            store,
            consignmentActionCreator
        )
    );

    registry.register('default', () =>
        new DefaultShippingStrategy(
            store,
            consignmentActionCreator
        )
    );

    return registry;
}
