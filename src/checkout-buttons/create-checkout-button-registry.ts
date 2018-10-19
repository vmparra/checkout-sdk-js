import { createFormPoster } from '@bigcommerce/form-poster';
import { RequestSender } from '@bigcommerce/request-sender';
import { getScriptLoader } from '@bigcommerce/script-loader';

import { BillingAddressActionCreator, BillingAddressRequestSender } from '../billing';
import { CheckoutActionCreator, CheckoutRequestSender, CheckoutStore } from '../checkout';
import { Registry } from '../common/registry';
import { ConfigActionCreator, ConfigRequestSender } from '../config';
import { PaymentMethodActionCreator, PaymentMethodRequestSender } from '../payment';
import { BraintreeScriptLoader, BraintreeSDKCreator } from '../payment/strategies/braintree';
import { GooglePayBraintreeInitializer, GooglePayPaymentProcessor, GooglePayScriptLoader } from '../payment/strategies/googlepay';
import { MasterpassScriptLoader } from '../payment/strategies/masterpass';
import { PaypalScriptLoader } from '../payment/strategies/paypal';

import { BraintreePaypalButtonStrategy, CheckoutButtonStrategy, GooglePayBraintreeButtonStrategy, MasterpassButtonStrategy } from './strategies';

export default function createCheckoutButtonRegistry(
    store: CheckoutStore,
    requestSender: RequestSender
): Registry<CheckoutButtonStrategy> {
    const registry = new Registry<CheckoutButtonStrategy>();
    const scriptLoader = getScriptLoader();
    const checkoutActionCreator = new CheckoutActionCreator(
        new CheckoutRequestSender(requestSender),
        new ConfigActionCreator(new ConfigRequestSender(requestSender))
    );
    const braintreeScriptLoader = new BraintreeScriptLoader(scriptLoader);
    const braintreeSDKCreator = new BraintreeSDKCreator(braintreeScriptLoader);
    const paymentMethodActionCreator = new PaymentMethodActionCreator(new PaymentMethodRequestSender(requestSender));
    const formPoster = createFormPoster();

    registry.register('braintreepaypal', () =>
        new BraintreePaypalButtonStrategy(
            store,
            checkoutActionCreator,
            new BraintreeSDKCreator(new BraintreeScriptLoader(scriptLoader)),
            new PaypalScriptLoader(scriptLoader),
            formPoster
        )
    );

    registry.register('braintreepaypalcredit', () =>
        new BraintreePaypalButtonStrategy(
            store,
            checkoutActionCreator,
            new BraintreeSDKCreator(new BraintreeScriptLoader(scriptLoader)),
            new PaypalScriptLoader(scriptLoader),
            formPoster,
            true
        )
    );

    registry.register('masterpass', () =>
        new MasterpassButtonStrategy(
            store,
            checkoutActionCreator,
            new MasterpassScriptLoader(scriptLoader)
        )
    );

    registry.register('googlepaybraintree', () =>
        new GooglePayBraintreeButtonStrategy(
            store,
            formPoster,
            checkoutActionCreator,
            paymentMethodActionCreator,
            new GooglePayPaymentProcessor(
                store,
                paymentMethodActionCreator,
                new GooglePayScriptLoader(scriptLoader),
                new GooglePayBraintreeInitializer(braintreeSDKCreator),
                new BillingAddressActionCreator(new BillingAddressRequestSender(requestSender)),
                requestSender
            )
        )
    );

    return registry;
}
