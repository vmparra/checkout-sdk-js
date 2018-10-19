import createRequestSender from '../../node_modules/@bigcommerce/request-sender/lib/create-request-sender';
import createCheckoutStore from '../checkout/create-checkout-store';
import Registry from '../common/registry/registry';

import createShippingStrategyRegistry from './create-shipping-strategy-registry';
import AmazonPayShippingStrategy from './strategies/amazon-pay-shipping-strategy';
import GooglePayBraintreeShippingStrategy from './strategies/googlepay-braintree-shipping-strategy';
import ShippingStrategy from './strategies/shipping-strategy';

describe('CreateShippingStrategyRegistry', () => {
    let registry: Registry<ShippingStrategy>;

    beforeEach(() => {
        const store = createCheckoutStore();
        const requestSender = createRequestSender();
        registry = createShippingStrategyRegistry(store, requestSender);
    });

    it('can instantiate amazon', () => {
        const shippingStrategy = registry.get('amazon');
        expect(shippingStrategy).toBeInstanceOf(AmazonPayShippingStrategy);
    });

    it('can instantiate googlepaybraintree', () => {
        const shippingStrategy = registry.get('googlepaybraintree');
        expect(shippingStrategy).toBeInstanceOf(GooglePayBraintreeShippingStrategy);
    });
});
