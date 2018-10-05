import { PaymentMethodActionCreator, PaymentMethodRequestSender } from '../..';
import { createRequestSender } from '../../../../node_modules/@bigcommerce/request-sender';
import { ScriptLoader } from '../../../../node_modules/@bigcommerce/script-loader/lib';
import { BillingAddressActionCreator, BillingAddressRequestSender } from '../../../billing';
import { CheckoutStore } from '../../../checkout';
import { BraintreeScriptLoader, BraintreeSDKCreator } from '../braintree';

import { GooglePayBraintreeInitializer,  GooglePayPaymentProcessor, GooglePayScriptLoader } from '.';

export default function createGooglePayPaymentProcessor(
    store: CheckoutStore,
    scriptLoader: ScriptLoader): GooglePayPaymentProcessor {

    const requestSender = createRequestSender();
    const paymentMethodActionCreator = new PaymentMethodActionCreator(new PaymentMethodRequestSender(requestSender));
    const billingAddressActionCreator = new BillingAddressActionCreator(new BillingAddressRequestSender(requestSender));
    const braintreeScitpLoader = new BraintreeScriptLoader(scriptLoader);
    const braintreeSDKCreator = new BraintreeSDKCreator(braintreeScitpLoader);
    const googlePayBraintreeInitializer = new GooglePayBraintreeInitializer(braintreeSDKCreator);

    return new GooglePayPaymentProcessor(
        store,
        paymentMethodActionCreator,
        new GooglePayScriptLoader(scriptLoader),
        googlePayBraintreeInitializer,
        billingAddressActionCreator,
        requestSender
    );
}
