
import { MdClose } from 'react-icons/md';

const ConfirmationModal = ({ title, message, options, onClose }) => {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-scale-up border border-[#E8E8E8]">

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b border-[#E8E8E8] bg-[#F6F6F6]">
                    <h3 className="text-lg font-bold text-[#0C4DA2] tracking-wide">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 hover:text-[#0C4DA2] transition-colors"
                    >
                        <MdClose className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 bg-white">
                    <p className="text-[#313131] text-base leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Footer / Actions */}
                <div className="flex flex-col gap-3 p-5 pt-0 bg-white">
                    {options.map((option, index) => (
                        <button
                            key={index}
                            onClick={option.onClick}
                            className={`
                                w-full py-3 px-4 rounded-lg text-sm font-bold transition-all duration-200 shadow-sm
                                ${option.variant === 'danger'
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
                                    : option.variant === 'primary'
                                        ? 'bg-[#0C4DA2] text-white hover:bg-[#093d80] shadow-md'
                                        : 'bg-[#F6F6F6] text-[#313131] hover:bg-[#E8E8E8] border border-[#E8E8E8]'
                                }
                            `}
                        >
                            {option.label}
                        </button>
                    ))}
                    <button
                        onClick={onClose}
                        className="w-full py-3 px-4 rounded-lg text-sm font-medium text-gray-500 hover:text-[#0C4DA2] hover:bg-[#F6F6F6] transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
