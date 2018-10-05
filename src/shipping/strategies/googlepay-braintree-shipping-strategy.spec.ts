import { createAction } from '@bigcommerce/data-store';
import { createRequestSender } from '@bigcommerce/request-sender';
import { Observable } from 'rxjs';

import { ConsignmentRequestSender } from '..';
import { createCheckoutStore, CheckoutRequestSender, CheckoutStore } from '../../checkout';
import ConsignmentActionCreator from '../consignment-action-creator';
import { ConsignmentActionType } from '../consignment-actions';
import { getFlatRateOption } from '../internal-shipping-options.mock';
import { getShippingAddress } from '../shipping-addresses.mock';

import { GooglePayBraintreeShippingStrategy } from './';

describe('GooglePayBraintreeShippingStrategy', () => {
    let store: CheckoutStore;
    let consignmentActionCreator: ConsignmentActionCreator;

    beforeEach(() => {
        store = createCheckoutStore();
        consignmentActionCreator = new ConsignmentActionCreator(
            new ConsignmentRequestSender(createRequestSender()),
            new CheckoutRequestSender(createRequestSender())
        );
    });

    it('updates shipping address', async () => {
        const strategy = new GooglePayBraintreeShippingStrategy(store, consignmentActionCreator);
        const address = getShippingAddress();
        const options = {};
        const action = Observable.of(createAction(ConsignmentActionType.CreateConsignmentsRequested));

        jest.spyOn(consignmentActionCreator, 'updateAddress')
            .mockReturnValue(action);

        jest.spyOn(store, 'dispatch');

        const output = await strategy.updateAddress(address, options);

        expect(consignmentActionCreator.updateAddress).toHaveBeenCalledWith(address, options);
        expect(store.dispatch).toHaveBeenCalledWith(action);
        expect(output).toEqual(store.getState());
    });

    it('selects shipping option', async () => {
        const strategy = new GooglePayBraintreeShippingStrategy(store, consignmentActionCreator);
        const method = getFlatRateOption();
        const options = {};
        const action = Observable.of(createAction(ConsignmentActionType.UpdateConsignmentRequested));

        jest.spyOn(consignmentActionCreator, 'selectShippingOption')
            .mockReturnValue(action);

        jest.spyOn(store, 'dispatch');

        const output = await strategy.selectOption(method.id, options);

        expect(consignmentActionCreator.selectShippingOption).toHaveBeenCalledWith(method.id, options);
        expect(store.dispatch).toHaveBeenCalledWith(action);
        expect(output).toEqual(store.getState());
    });
});
