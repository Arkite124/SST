import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

/**
 * 범용 모달 (index.html 없이도 동작)
 * - open / isOpen 둘 중 하나만 true여도 표시
 * - #modal-root 자동 생성 → 포털 렌더
 * - ESC 닫기 / 오버레이 클릭 닫기 / 바닥 스크롤 잠금 / 포커스 복귀
 * - z-index 1000+ 고정
 */
export default function Modal({
                                  open,
                                  isOpen,
                                  onClose,
                                  children,
                                  closeOnEsc = true,
                                  closeOnOverlay = true,
                                  overlayClassName = "",
                                  contentClassName = "",
                                  ariaLabelledby,
                                  ariaDescribedby,
                              }) {
    const show = Boolean(open ?? isOpen);
    const contentRef = useRef(null);

    // #modal-root 없으면 자동 생성
    const portalRoot = useMemo(() => {
        let root = document.getElementById("modal-root");
        if (!root) {
            root = document.createElement("div");
            root.id = "modal-root";
            document.body.appendChild(root);
        }
        return root;
    }, []);

    useEffect(() => {
        if (!show) return;

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const prevActive = document.activeElement;
        setTimeout(() => contentRef.current?.focus?.(), 0);

        const onKey = (e) => {
            if (closeOnEsc && e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKey);

        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
            prevActive?.focus?.();
        };
    }, [show, closeOnEsc, onClose]);

    if (!show) return null;

    return createPortal(
        <div
            className={`fixed inset-0 z-[1000] ${overlayClassName}`}
            aria-hidden={!show}
        >
            {/* 오버레이 */}
            <div
                className="absolute inset-0 bg-black/40"
                onClick={() => closeOnOverlay && onClose?.()}
            />
            {/* 콘텐츠 */}
            <div
                ref={contentRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-labelledby={ariaLabelledby}
                aria-describedby={ariaDescribedby}
                className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                    max-h-[90vh] w-[92vw] max-w-xl overflow-auto rounded-2xl
                    bg-white shadow-xl z-[1001] p-6 animate-fadeIn ${contentClassName}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 필요하면 X 버튼: 소비자 컴포넌트에서 넣기 권장 */}
                {children}
            </div>
        </div>,
        portalRoot
    );
}
