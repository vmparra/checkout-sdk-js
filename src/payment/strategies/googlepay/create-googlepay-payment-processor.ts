import { createRequestSender } from '@bigcommerce/request-sender';
import { getScriptLoader } from '@bigcommerce/script-loader';

import { PaymentMethodActionCreator, PaymentMethodRequestSender } from '../..';
import { BillingAddressActionCreator, BillingAddressRequestSender } from '../../../billing';
import { CheckoutRequestSender, CheckoutStore } from '../../../checkout';
import { ConsignmentActionCreator, ConsignmentRequestSender } from '../../../shipping';
import { BraintreeScriptLoader, BraintreeSDKCreator } from '../braintree';

import { GooglePayBraintreeInitializer,  GooglePayPaymentProcessor, GooglePayScriptLoader } from '.';

export default function createGooglePayPaymentProcessor(store: CheckoutStore): GooglePayPaymentProcessor {

    const requestSender = createRequestSender();
    const scriptLoader = getScriptLoader();

    return new GooglePayPaymentProcessor(
        store,
        new PaymentMethodActionCreator(new PaymentMethodRequestSender(requestSender)),
        new GooglePayScriptLoader(scriptLoader),
        new GooglePayBraintreeInitializer(
            new BraintreeSDKCreator(new BraintreeScriptLoader(scriptLoader))),
        new BillingAddressActionCreator(new BillingAddressRequestSender(requestSender)),
        new ConsignmentActionCreator(
            new ConsignmentRequestSender(requestSender),
            new CheckoutRequestSender(requestSender)),
        requestSender
    );
}
