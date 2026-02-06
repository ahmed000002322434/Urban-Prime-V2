import React, { createContext, useState, useContext, ReactNode } from 'react';

interface ModalContextType {
  showModal: (type: string, props?: any) => void;
  hideModal: () => void;
  modalType: string | null;
  modalProps: any;
}

export const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalType, setModalType] = useState<string | null>(null);
  const [modalProps, setModalProps] = useState<any>({});

  const showModal = (type: string, props: any = {}) => {
    setModalType(type);
    setModalProps(props);
    document.body.style.overflow = 'hidden';
  };

  const hideModal = () => {
    setModalType(null);
    setModalProps({});
    document.body.style.overflow = 'auto';
  };

  const value = { showModal, hideModal, modalType, modalProps };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
