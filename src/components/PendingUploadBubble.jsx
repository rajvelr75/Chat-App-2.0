import { MdClose } from 'react-icons/md';

const PendingUploadBubble = ({ progress, type, previewUrl }) => {
    return (
        <div className="flex justify-end mb-4 animate-pulse">
            <div className="bg-gray-800/50 rounded-lg p-2 max-w-[70%] border border-glass relative overflow-hidden">
                <div className="relative rounded overflow-hidden">
                    {type === 'video' ? (
                        <video src={previewUrl} className="w-full h-48 object-cover opacity-50" />
                    ) : (
                        <img src={previewUrl} alt="Uploading..." className="w-full h-48 object-cover opacity-50" />
                    )}

                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-12 h-12">
                            <svg className="w-full h-full" viewBox="0 0 36 36">
                                <path
                                    d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#444"
                                    strokeWidth="4"
                                />
                                <path
                                    d="M18 2.0845
                                    a 15.9155 15.9155 0 0 1 0 31.831
                                    a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#00C2FF"
                                    strokeWidth="4"
                                    strokeDasharray={`${progress}, 100`}
                                    className="transition-all duration-200 ease-out"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                                {Math.round(progress)}%
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PendingUploadBubble;
