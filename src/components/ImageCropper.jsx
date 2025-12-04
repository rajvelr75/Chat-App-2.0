import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { MdCheck, MdClose, MdZoomIn, MdZoomOut } from 'react-icons/md';

const ImageCropper = ({ imageSrc, onCropComplete, onCancel }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropChange = (crop) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom) => {
        setZoom(zoom);
    };

    const onCropCompleteCallback = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url) =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (imageSrc, pixelCrop) => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    reject(new Error('Canvas is empty'));
                    return;
                }
                blob.name = 'cropped.jpeg';
                resolve(blob);
            }, 'image/jpeg');
        });
    };

    const handleSave = async () => {
        try {
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropComplete(croppedImage);
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
            <div className="flex-1 relative">
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    onCropChange={onCropChange}
                    onCropComplete={onCropCompleteCallback}
                    onZoomChange={onZoomChange}
                    classes={{
                        containerClassName: "bg-transparent",
                        mediaClassName: "",
                        cropAreaClassName: "border-2 border-accent shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"
                    }}
                />
            </div>

            <div className="p-4 glass-panel border-t border-glass space-y-4">
                <div className="flex items-center gap-4 max-w-md mx-auto">
                    <MdZoomOut className="text-text-secondary" />
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 accent-accent h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <MdZoomIn className="text-text-secondary" />
                </div>

                <div className="flex justify-center gap-4">
                    <button
                        onClick={onCancel}
                        className="glass-button px-6 py-2 rounded-full text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                        <MdClose className="w-5 h-5" /> Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="glass-button px-6 py-2 rounded-full text-accent hover:bg-accent/10 flex items-center gap-2"
                    >
                        <MdCheck className="w-5 h-5" /> Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImageCropper;
