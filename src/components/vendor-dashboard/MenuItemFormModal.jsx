import React, { useEffect, useRef, useState } from 'react';
import { X, Upload, Plus, Trash2, ImageOff, Clock, Sparkles } from 'lucide-react';
import { MENU_CATEGORIES } from '../../data/vendorMockData';

const EMPTY = {
  name: '',
  category: MENU_CATEGORIES[0],
  price: '',
  prepTime: '',
  description: '',
  image: '',
  isAvailable: true,
  isPreorder: false,
  preorderCutoff: '',
  popular: false,
  options: [],
};

const Toggle = ({ checked, onChange, label, hint }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className="flex items-center gap-3 text-left"
  >
    <span
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-[#542813]' : 'bg-stone-300'
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : ''
        }`}
      />
    </span>
    <span>
      <span className="block text-xs font-bold text-gray-900">{label}</span>
      {hint && <span className="block text-[11px] text-stone-400">{hint}</span>}
    </span>
  </button>
);

export default function MenuItemFormModal({ isOpen, item, onClose, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (item) {
      setForm({
        ...EMPTY,
        ...item,
        price: String(item.price ?? ''),
        options: (item.options || []).map((option) => ({
          name: option.name,
          choicesText: (option.choices || []).join(', '),
        })),
      });
    } else {
      setForm(EMPTY);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const handleImageFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'Please choose an image file.' }));
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Image must be smaller than 3 MB.' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update({ image: String(reader.result) });
      setErrors((prev) => ({ ...prev, image: '' }));
    };
    reader.readAsDataURL(file);
  };

  const addOption = () => update({ options: [...form.options, { name: '', choicesText: '' }] });
  const updateOption = (index, patch) =>
    update({ options: form.options.map((option, i) => (i === index ? { ...option, ...patch } : option)) });
  const removeOption = (index) => update({ options: form.options.filter((_, i) => i !== index) });

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Dish name is required.';
    const price = Number(form.price);
    if (!form.price || Number.isNaN(price) || price <= 0) next.price = 'Enter a valid price above 0.';
    if (!form.prepTime.trim()) next.prepTime = 'Preparation time is required.';
    const optionsValid = form.options.every(
      (option) => option.name.trim() && option.choicesText.trim(),
    );
    if (!optionsValid) next.options = 'Every option needs a name and at least one choice.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: form.name.trim(),
      category: form.category,
      price: Number(form.price),
      prepTime: form.prepTime.trim(),
      description: form.description.trim(),
      image: form.image.trim(),
      isAvailable: form.isAvailable,
      isPreorder: form.isPreorder,
      preorderCutoff: form.isPreorder ? form.preorderCutoff.trim() : '',
      popular: form.popular,
      options: form.options
        .filter((option) => option.name.trim() && option.choicesText.trim())
        .map((option) => ({
          name: option.name.trim(),
          choices: option.choicesText
            .split(',')
            .map((choice) => choice.trim())
            .filter(Boolean),
        })),
    });
    onClose();
  };

  const inputClass = (field) =>
    `w-full text-sm p-3 rounded-xl border outline-none transition ${
      errors[field] ? 'border-red-300 focus:border-red-400' : 'border-stone-200 focus:border-[#542813]'
    }`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item ? 'Edit menu item' : 'Add menu item'}
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full sm:max-w-2xl max-h-[94vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-100 animate-scale-in"
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-stone-100 px-5 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-gray-900">{item ? 'Edit Dish' : 'Add New Dish'}</h3>
            <p className="text-[11px] text-stone-400 font-medium">
              {item ? 'Update details, pricing and availability' : 'Add a dish to your digital menu'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close form"
            className="w-9 h-9 rounded-full text-stone-500 hover:text-stone-800 hover:bg-stone-100 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {/* Image */}
          <div>
            <label className="text-xs font-bold text-stone-500 block mb-1.5">Dish Image</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-40 h-32 rounded-2xl overflow-hidden border border-stone-200 bg-stone-50 flex items-center justify-center flex-shrink-0">
                {form.image ? (
                  <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-stone-300 flex flex-col items-center gap-1">
                    <ImageOff className="w-6 h-6" />
                    <span className="text-[10px] font-semibold">No image</span>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <input
                  type="url"
                  value={form.image.startsWith('data:') ? '' : form.image}
                  onChange={(event) => update({ image: event.target.value })}
                  placeholder="Paste an image URL…"
                  className={inputClass('image')}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#faf6f2] hover:bg-[#f5ebe1] text-[#3d1b0c] border border-[#ebd7c5] font-bold text-xs transition active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload image
                  </button>
                  {form.image && (
                    <button
                      type="button"
                      onClick={() => update({ image: '' })}
                      className="text-xs font-bold text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                {errors.image && <p className="text-[11px] text-red-500 font-semibold">{errors.image}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-stone-500 block mb-1.5">Dish Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => update({ name: event.target.value })}
                placeholder="e.g. Whole Spiced Chicken & Rice"
                className={inputClass('name')}
              />
              {errors.name && <p className="text-[11px] text-red-500 font-semibold mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-stone-500 block mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(event) => update({ category: event.target.value })}
                className={inputClass('category')}
              >
                {MENU_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-500 block mb-1.5">Price (RWF)</label>
              <input
                type="number"
                min="0"
                value={form.price}
                onChange={(event) => update({ price: event.target.value })}
                placeholder="5000"
                className={inputClass('price')}
              />
              {errors.price && <p className="text-[11px] text-red-500 font-semibold mt-1">{errors.price}</p>}
            </div>

            <div>
              <label className="text-xs font-bold text-stone-500 block mb-1.5">Preparation Time</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.prepTime}
                  onChange={(event) => update({ prepTime: event.target.value })}
                  placeholder="e.g. 25 min"
                  className={`${inputClass('prepTime')} pl-9`}
                />
                <Clock className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
              </div>
              {errors.prepTime && <p className="text-[11px] text-red-500 font-semibold mt-1">{errors.prepTime}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-stone-500 block mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(event) => update({ description: event.target.value })}
                rows={3}
                placeholder="Describe the dish, ingredients and what makes it special…"
                className={`${inputClass('description')} resize-none`}
              />
            </div>
          </div>

          {/* Options builder */}
          <div className="rounded-2xl border border-stone-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">Food Options</h4>
                <p className="text-[11px] text-stone-400">e.g. Size · Large, Small · Extras · Extra sauce</p>
              </div>
              <button
                type="button"
                onClick={addOption}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                Add option
              </button>
            </div>

            {form.options.length === 0 ? (
              <p className="text-xs text-stone-400">No options yet. Add sizes or add-ons customers can choose.</p>
            ) : (
              <div className="space-y-3">
                {form.options.map((option, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_auto] gap-2 items-start">
                    <input
                      type="text"
                      value={option.name}
                      onChange={(event) => updateOption(index, { name: event.target.value })}
                      placeholder="Option name (e.g. Size)"
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:border-[#542813] outline-none transition"
                    />
                    <input
                      type="text"
                      value={option.choicesText}
                      onChange={(event) => updateOption(index, { choicesText: event.target.value })}
                      placeholder="Choices, comma separated (Large +500 RWF, Small)"
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:border-[#542813] outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      aria-label="Remove option"
                      className="p-2.5 rounded-xl text-red-500 hover:bg-red-50 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {errors.options && <p className="text-[11px] text-red-500 font-semibold">{errors.options}</p>}
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl bg-stone-50 border border-stone-100 p-4">
            <Toggle
              checked={form.isAvailable}
              onChange={(value) => update({ isAvailable: value })}
              label="Available now"
              hint="Show this dish as orderable"
            />
            <Toggle
              checked={form.popular}
              onChange={(value) => update({ popular: value })}
              label="Mark as popular"
              hint="Highlight in the storefront"
            />
            <Toggle
              checked={form.isPreorder}
              onChange={(value) => update({ isPreorder: value })}
              label="Pre-order / scheduled"
              hint="Accepts scheduled orders"
            />
            {form.isPreorder && (
              <div>
                <label className="text-xs font-bold text-stone-500 block mb-1.5">Pre-order notice</label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.preorderCutoff}
                    onChange={(event) => update({ preorderCutoff: event.target.value })}
                    placeholder="e.g. Order before 10:00 AM"
                    className={`${inputClass('preorderCutoff')} pl-9`}
                  />
                  <Sparkles className="w-4 h-4 text-[#8a5332] absolute left-3 top-3.5" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-stone-100 px-5 sm:px-6 py-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm transition active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#2b1206] via-[#481f0d] to-[#200d05] hover:from-[#3d1b0c] text-white font-bold text-sm shadow-md transition active:scale-95"
          >
            {item ? 'Save Changes' : 'Add Dish'}
          </button>
        </div>
      </form>
    </div>
  );
}
