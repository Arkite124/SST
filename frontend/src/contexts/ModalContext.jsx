import { createContext, useContext, useState, useEffect } from "react";
import { Dialog } from "@headlessui/react";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

const ModalContext = createContext(null);

export function ModalProvider({ children }) {
    const [isOpen, setIsOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalContent, setModalContent] = useState(null);
    const [modalType, setModalType] = useState("custom"); // alert | confirm | custom
    const [loadingMessage, setLoadingMessage] = useState(null);
    const [confirmResolve, setConfirmResolve] = useState(null);

    const closeModal = () => {
        setIsOpen(false);
        setModalTitle("");
        setModalContent(null);
        setLoadingMessage(null);

        if (confirmResolve) {
            confirmResolve(false);
            setConfirmResolve(null);
        }
    };

    // Alert
    const alert = (title, message) => {
        return new Promise((resolve) => {
            setModalTitle(title);
            setModalContent(<p className="text-center">{message}</p>);
            setModalType("alert");
            setIsOpen(true);
            setConfirmResolve(() => resolve);
        });
    };

    // Confirm
    const confirm = (title, message) => {
        return new Promise((resolve) => {
            setModalTitle(title);
            setModalContent(<p className="text-center">{message}</p>);
            setModalType("confirm");
            setIsOpen(true);
            setConfirmResolve(() => resolve);
        });
    };

    // Custom Modal
    const openModal = (title, jsx) => {
        setModalTitle(title);
        setModalContent(jsx);
        setModalType("custom");
        setIsOpen(true);
    };

    const showLoadingModal = (message = "로딩 중...") => {
        setLoadingMessage(message);
        setModalType("loading");
        setIsOpen(true);
    };

    const hideLoadingModal = () => {
        setLoadingMessage(null);
        setModalType("custom");
        setIsOpen(false);
    };

    /** ENTER Key Support */
    useEffect(() => {
        if (!isOpen) return;

        const handler = (e) => {
            if (e.key === "Enter") {
                if (modalType === "alert" || modalType === "confirm") {
                    if (confirmResolve) confirmResolve(true);
                    setConfirmResolve(null);
                    setIsOpen(false);
                }
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [isOpen, modalType, confirmResolve]);

    const handleConfirm = () => {
        if (confirmResolve) confirmResolve(true);
        setConfirmResolve(null);
        setIsOpen(false);
    };

    return (
        <ModalContext.Provider value={{ alert, confirm, openModal, closeModal, showLoadingModal, hideLoadingModal  }}>
            {children}

            <Dialog open={isOpen} onClose={closeModal} className="z-50">
                <div className="fixed inset-0 bg-black/40" />

                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel
                        className="
                            bg-white rounded-lg shadow-xl p-6 w-full
                            max-w-[90%] sm:max-w-md md:max-w-lg lg:max-w-xl
                            transition-all
                        "
                    >
                        {/* 아이콘 */}
                        {(modalType === "alert" || modalType === "confirm") && (
                            <div className="flex justify-center mb-4">
                                {modalType === "alert" && (
                                    <FaExclamationTriangle className="text-yellow-500 text-5xl" />
                                )}
                                {modalType === "confirm" && (
                                    <FaCheckCircle className="text-green-500 text-5xl" />
                                )}
                            </div>
                        )}

                        {/* 제목 */}
                        <Dialog.Title className="text-xl md:text-2xl font-bold text-center mb-3">
                            {modalTitle}
                        </Dialog.Title>

                        {/* 내용 */}
                        <div className="mb-6 text-base md:text-lg">
                            {modalContent}
                        </div>

                        {/* 버튼 */}
                        {modalType === "alert" && (
                            <div className="flex justify-center">
                                <button
                                    onClick={handleConfirm}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-md"
                                >
                                    확인 (Enter)
                                </button>
                            </div>
                        )}

                        {modalType === "confirm" && (
                            <div className="flex justify-center gap-3">
                                <button
                                    onClick={handleConfirm}
                                    className="px-4 py-2 bg-green-600 text-white rounded-md"
                                >
                                    확인 (Enter)
                                </button>
                                <button
                                    onClick={closeModal}
                                    className="px-4 py-2 bg-gray-300 rounded-md"
                                >
                                    취소
                                </button>
                            </div>
                        )}
                    </Dialog.Panel>
                </div>
            </Dialog>
            <Dialog open={modalType === "loading"} onClose={() => {}} className="relative z-[10000]">
                <div className="fixed inset-0 bg-black/40" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="bg-white rounded-lg shadow-xl p-6">
                        <div className="flex flex-col items-center justify-center gap-4">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500" />
                            <p>{loadingMessage}</p>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </ModalContext.Provider>
    );
}

export const useModal = () => useContext(ModalContext);
