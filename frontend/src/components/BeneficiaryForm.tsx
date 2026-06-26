import React from 'react';
import { Plus, Trash2, ShieldAlert } from 'lucide-react';
import { Beneficiary } from '../types/vault';

interface BeneficiaryFormProps {
  beneficiaries: Beneficiary[];
  onChange: (beneficiaries: Beneficiary[]) => void;
}

export const BeneficiaryForm: React.FC<BeneficiaryFormProps> = ({ beneficiaries, onChange }) => {
  const addBeneficiary = () => {
    // Add default beneficiary with 0% split
    onChange([...beneficiaries, { address: '', basisPoints: 0 }]);
  };

  const removeBeneficiary = (index: number) => {
    const updated = beneficiaries.filter((_, i) => i !== index);
    onChange(updated);
  };

  const updateField = (index: number, field: keyof Beneficiary, value: any) => {
    const updated = beneficiaries.map((b, i) => {
      if (i === index) {
        return { ...b, [field]: value };
      }
      return b;
    });
    onChange(updated);
  };

  const adjustSplit = (index: number, amount: number) => {
    // Adjust basis points (amount is in percent, convert to bps)
    const bpAmount = amount * 100;
    const current = beneficiaries[index].basisPoints;
    const next = Math.max(0, Math.min(10000, current + bpAmount));
    updateField(index, 'basisPoints', next);
  };

  const totalBP = beneficiaries.reduce((acc, b) => acc + b.basisPoints, 0);
  const totalPercent = totalBP / 100;
  const isCorrectSum = totalBP === 10000;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-300">Designate Beneficiaries</h4>
        <button
          type="button"
          onClick={addBeneficiary}
          className="flex items-center space-x-1 text-xs text-purple-400 hover:text-purple-300 font-semibold border border-purple-500/20 bg-purple-500/5 px-2.5 py-1.5 rounded-lg transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Beneficiary</span>
        </button>
      </div>

      {beneficiaries.length === 0 ? (
        <div className="border border-dashed border-gray-800 rounded-xl p-6 text-center text-gray-500 text-xs">
          No beneficiaries added yet. A minimum of 1 is required.
        </div>
      ) : (
        <div className="space-y-3">
          {beneficiaries.map((b, index) => (
            <div
              key={index}
              className="p-3 bg-gray-900/35 border border-gray-800 rounded-xl space-y-3 sm:space-y-0 sm:flex sm:items-center sm:space-x-3"
            >
              {/* Address input */}
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 block mb-1">Stellar Address (G...)</label>
                <input
                  type="text"
                  required
                  placeholder="GD..."
                  value={b.address}
                  onChange={(e) => updateField(index, 'address', e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg glass-input"
                />
              </div>

              {/* Mobile-Friendly Stepper Split percentage */}
              <div className="w-full sm:w-[180px]">
                <label className="text-[10px] text-gray-500 block mb-1">Percentage Split</label>
                <div className="flex items-center space-x-1.5">
                  <button
                    type="button"
                    onClick={() => adjustSplit(index, -5)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold transition select-none"
                  >
                    -5
                  </button>
                  <div className="flex-1 text-center font-mono font-bold text-sm bg-gray-950/80 border border-gray-800 rounded-lg py-1.5 text-white">
                    {b.basisPoints / 100}%
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustSplit(index, 5)}
                    className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold transition select-none"
                  >
                    +5
                  </button>
                </div>
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeBeneficiary(index)}
                className="w-8 h-8 flex items-center justify-center bg-red-950/10 border border-red-500/10 hover:border-red-500/20 text-red-400 hover:text-red-300 rounded-lg transition"
                title="Remove Beneficiary"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Validation status footer */}
      <div className="flex items-center justify-between border-t border-gray-800/80 pt-3 text-xs">
        <span className="text-gray-400">Total Assigned Split:</span>
        <div className="flex items-center space-x-1.5">
          <span
            className={`font-bold font-mono ${
              isCorrectSum ? 'text-emerald-400' : 'text-amber-500'
            }`}
          >
            {totalPercent}% / 100%
          </span>
          {!isCorrectSum && (
            <div className="flex items-center space-x-1 text-amber-500/80" title="Splits must equal 100%">
              <ShieldAlert className="w-4 h-4 animate-bounce" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
