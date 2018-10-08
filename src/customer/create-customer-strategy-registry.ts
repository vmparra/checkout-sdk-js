import { createFormPoster } from '@bigcommerce/form-poster';
import { RequestSender } from '@bigcommerce/request-sender';
import { getScriptLoader } from '@bigcommerce/script-loader';

import { BillingAddressActionCreator, BillingAddressRequestSender } from '../billing';
import { CheckoutActionCreator, CheckoutRequestSender, CheckoutStore } from '../checkout';
import { Registry } from '../common/registry';
import { ConfigActionCreator, ConfigRequestSender } from '../config';
import { PaymentMethodActionCreator, PaymentMethodRequestSender } from '../payment';
import { AmazonPayScriptLoader } from '../payment/strategies/amazon-pay';
import {
    createBraintreeVisaCheckoutPaymentProcessor,
    BraintreeScriptLoader,
    BraintreeSDKCreator,
    VisaCheckoutScriptLoader
} from '../payment/strategies/braintree';
import { ChasePayScriptLoader } from '../payment/strategies/chasepay';
import { GooglePayBraintreeInitializer, GooglePayPaymentProcessor, GooglePayScriptLoader} from '../payment/strategies/googlepay';
import { MasterpassScriptLoader } from '../payment/strategies/masterpass';
import { RemoteCheckoutActionCreator, RemoteCheckoutRequestSender } from '../remote-checkout';
import { createShippingStrategyRegistry, ShippingStrategyActionCreator } from '../shipping';

import { CustomerActionCreator, CustomerRequestSender, CustomerStrategyActionCreator } from './';
import {
    AmazonPayCustomerStrategy,
    BraintreeVisaCheckoutCustomerStrategy,
    ChasePayCustomerStrategy,
    CustomerStrategy,
    DefaultCustomerStrategy,
    GooglePayBraintreeCustomerStrategy,
    MasterpassCustomerStrategy,
    SquareCustomerStrategy
} from './strategies';

export default function createCustomerStrategyRegistry(
    store: CheckoutStore,
    requestSender: RequestSender
): Registry<CustomerStrategy> {
    const registry = new Registry<CustomerStrategy>();
    const scriptLoader = getScriptLoader();
    const braintreeScriptLoader = new BraintreeScriptLoader(scriptLoader);
    const braintreeSdkCreator = new BraintreeSDKCreator(braintreeScriptLoader);
    const checkoutActionCreator = new CheckoutActionCreator(
        new CheckoutRequestSender(requestSender),
        new ConfigActionCreator(new ConfigRequestSender(requestSender))
    );
    const formPoster = createFormPoster();
    const paymentMethodActionCreator = new PaymentMethodActionCreator(new PaymentMethodRequestSender(requestSender));
    const remoteCheckoutRequestSender = new RemoteCheckoutRequestSender(requestSender);
    const remoteCheckoutActionCreator = new RemoteCheckoutActionCreator(remoteCheckoutRequestSender);

    registry.register('amazon', () =>
        new AmazonPayCustomerStrategy(
            store,
            paymentMethodActionCreator,
            remoteCheckoutActionCreator,
            remoteCheckoutRequestSender,
            new AmazonPayScriptLoader(scriptLoader)
        )
    );

    registry.register('braintreevisacheckout', () =>
        new BraintreeVisaCheckoutCustomerStrategy(
            store,
            checkoutActionCreator,
            paymentMethodActionCreator,
            new CustomerStrategyActionCreator(registry),
            remoteCheckoutActionCreator,
            createBraintreeVisaCheckoutPaymentProcessor(scriptLoader, requestSender),
            new VisaCheckoutScriptLoader(scriptLoader)
        )
    );

    registry.register('chasepay', () =>
        new ChasePayCustomerStrategy(
            store,
            paymentMethodActionCreator,
            remoteCheckoutActionCreator,
            new ChasePayScriptLoader(scriptLoader),
            requestSender,
            formPoster
        )
    );

    registry.register('squarev2', () =>
        new SquareCustomerStrategy(
            store,
            new RemoteCheckoutActionCreator(remoteCheckoutRequestSender)
        )
    );

    registry.register('masterpass', () =>
        new MasterpassCustomerStrategy(
            store,
            paymentMethodActionCreator,
            remoteCheckoutActionCreator,
            new MasterpassScriptLoader(scriptLoader)
        )
    );

    registry.register('googlepaybraintree', () =>
        new GooglePayBraintreeCustomerStrategy(
            store,
            remoteCheckoutActionCreator,
            new GooglePayPaymentProcessor(
                store,
                paymentMethodActionCreator,
                new GooglePayScriptLoader(scriptLoader),
                new GooglePayBraintreeInitializer(braintreeSdkCreator),
                new BillingAddressActionCreator(new BillingAddressRequestSender(requestSender)),
                new ShippingStrategyActionCreator(createShippingStrategyRegistry(store, requestSender)),
                requestSender
            ),
            formPoster
        )
    );

    registry.register('default', () =>
        new DefaultCustomerStrategy(
            store,
            new CustomerActionCreator(
                new CustomerRequestSender(requestSender),
                checkoutActionCreator
            )
        )
    );

    return registry;
}
