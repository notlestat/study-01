import type { ImageAsset } from '../../domain/composition';
import { Icon } from '../ui/Icon';

interface ImageInputProps {
  image: ImageAsset | null;
  loading: boolean;
  onSelect: (file: File) => void;
  onRemove: () => void;
  onUseSample: () => void;
}

export function ImageInput({ image, loading, onSelect, onRemove, onUseSample }: ImageInputProps) {
  return (
    <div className="image-control">
      <label className="field-label" htmlFor="study-image">Image</label>
      <div className="image-input-well">
        {image ? <img src={image.src} alt="Selected source" /> : <Icon name="plus" size={24} />}
        <input
          id="study-image"
          className="image-file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          disabled={loading}
          aria-describedby="image-help image-source"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onSelect(file);
          }}
        />
        <span className="image-input-action">{loading ? 'Reading image…' : image ? 'Replace image' : 'Add an image'}</span>
      </div>
      <p className="image-source-name" id="image-source">{image?.name || 'No image selected'}</p>
      <p className="field-help" id="image-help">
        {image ? `${image.width} × ${image.height} / ${image.origin === 'sample' ? 'Built-in sample' : 'Local file'}` : 'PNG, JPEG, WebP, AVIF / up to 20 MB'}
      </p>
      <div className="image-input-actions">
        {image && <button type="button" onClick={onRemove}>Remove</button>}
        {image?.origin !== 'sample' && <button type="button" onClick={onUseSample}>Use sample</button>}
        <span>Stays on your device.</span>
      </div>
    </div>
  );
}
