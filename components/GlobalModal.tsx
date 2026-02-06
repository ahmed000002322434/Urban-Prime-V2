import React from 'react';
import { useModal } from '../context/ModalContext';

// Import Modal Content Components
import MyOrdersModal from './modals/MyOrdersModal';
import MyReviewsModal from './modals/MyReviewsModal';
import CouponsModal from './modals/CouponsModal';
import WalletModal from './modals/WalletModal';
import FollowedStoresModal from './modals/FollowedStoresModal';
import BrowsingHistoryModal from './modals/BrowsingHistoryModal';
import AddressesModal from './modals/AddressesModal';
import TrustAndVerificationModal from './modals/TrustAndVerificationModal';
import PermissionsModal from './modals/PermissionsModal';
import SwitchAccountsModal from './modals/SwitchAccountsModal';

const MODAL_COMPONENTS: { [key: string]: React.ComponentType<any> } = {
    'my-orders': MyOrdersModal,
    'my-reviews': MyReviewsModal,
    'coupons': CouponsModal,
    'wallet': WalletModal,
    'followed-stores': FollowedStoresModal,
    'browsing-history': BrowsingHistoryModal,
    'addresses': AddressesModal,
    'trust-verification': TrustAndVerificationModal,
    'permissions': PermissionsModal,
    'switch-accounts': SwitchAccountsModal,
};

const GlobalModal: React.FC = () => {
    const { modalType, modalProps, hideModal } = useModal();

    if (!modalType) {
        return null;
    }

    const SpecificModalContent = MODAL_COMPONENTS[modalType];
    
    if (!SpecificModalContent) {
        return null;
    }

    return <SpecificModalContent {...modalProps} onClose={hideModal} />;
};

export default GlobalModal;
