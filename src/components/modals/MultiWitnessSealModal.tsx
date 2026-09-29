import React, { useState } from 'react';
import { MultiWitnessSeal, OfficerCredential } from '../../types/evidence';
import { sha256 } from '../../services/engines/integrityEngine';
import { ShieldCheck, UserCheck, X, Check, Lock, Info } from 'lucide-react';

interface MultiWitnessSealModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSeal?: MultiWitnessSeal;
  onApplySeal: (seal: MultiWitnessSeal) => void;
  recordHash: string;
}

export const MultiWitnessSealModal: React.FC<MultiWitnessSealModalProps> = ({
  isOpen,
  onClose,
  currentSeal,
  onApplySeal,
  recordHash,
}) => {
  const [witnessName, setWitnessName] = useState(
    currentSeal?.secondaryWitness?.name || 'Sgt. V. Raman'
  );
  const [witnessBadge, setWitnessBadge] = useState(
    currentSeal?.secondaryWitness?.badgeNumber || 'ND-0892'
  );
  const [witnessDivision, setWitnessDivision] = useState(
    currentSeal?.secondaryWitness?.division || 'Forensic Field Verification Unit'
  );
  const [witnessRole, setWitnessRole] = useState(
    currentSeal?.secondaryWitness?.role || 'Supervisory Co-Witness'
  );

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSeal = async () => {
    setSaving(true);
    const nowIso = new Date().toISOString();

    const secSig = await sha256(
      `${witnessName}_${witnessBadge}_${recordHash}_${nowIso}`
    );

    const secondaryWitness: OfficerCredential = {
      id: `OP-${witnessBadge.replace(/[^0-9]/g, '') || '999'}`,
      name: witnessName,
      badgeNumber: witnessBadge,
      division: witnessDivision,
      role: witnessRole,
      timestamp: nowIso,
      signatureHash: secSig,
    };

    const primaryOfficer = currentSeal?.primaryOfficer || {
      id: 'OP-0418',
      name: 'Insp. R. Sharma',
      badgeNumber: 'ND-418',
      division: 'Narcotics Control Division',
      role: 'Primary Testing Officer',
      timestamp: nowIso,
      signatureHash: await sha256(`PRIMARY_OFFICER_0418_${recordHash}`),
    };

    const combinedSealHash = await sha256(
      JSON.stringify({
        primary: primaryOfficer.signatureHash,
        secondary: secondaryWitness.signatureHash,
        recordHash,
      })
    );

    const finalSeal: MultiWitnessSeal = {
      primaryOfficer,
      secondaryWitness,
      sealedAt: nowIso,
      multiWitnessStatus: 'DUAL_WITNESS_SEALED',
      sealHash: combinedSealHash,
    };

    setSaving(false);
    onApplySeal(finalSeal);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
      <div className="bg-white border border-[#CBD5E1] rounded-2xl max-w-lg w-full p-6 card-elevated-shadow space-y-5 animate-in fade-in-50 zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-[#EEF2F6]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#16865B]" />
            <h3 className="text-base font-bold text-[#17212B]">
              Multi-Witness Evidence Verification Seal
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#8A96A3] hover:text-[#17212B] p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#64717D] leading-relaxed">
          Attach a secondary witnessing officer or supervisory co-signature to verify the physical test observation and chain-of-custody sealing.
        </p>

        {/* Primary Officer Display */}
        <div className="p-3 rounded-xl bg-[#FAFBFD] border border-[#CBD5E1] text-xs space-y-1">
          <span className="text-[10px] uppercase font-bold text-[#8A96A3] block">Primary Testing Officer</span>
          <div className="flex justify-between font-mono">
            <span className="font-bold text-[#17212B]">Insp. R. Sharma (Badge ND-418)</span>
            <span className="text-[#16865B] font-semibold">✓ SEALED</span>
          </div>
        </div>

        {/* Secondary Witness Form */}
        <div className="space-y-3 text-xs">
          <span className="text-[10px] uppercase font-bold text-[#1769AA] block">
            Secondary Co-Witness Credentials
          </span>

          <div>
            <label className="text-[11px] text-[#64717D] block mb-1">Witness Officer Full Name</label>
            <input
              type="text"
              value={witnessName}
              onChange={(e) => setWitnessName(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#17212B] focus:outline-none focus:border-[#1769AA]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#64717D] block mb-1">Badge Number</label>
              <input
                type="text"
                value={witnessBadge}
                onChange={(e) => setWitnessBadge(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-mono text-[#17212B] focus:outline-none focus:border-[#1769AA]"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#64717D] block mb-1">Verification Role</label>
              <input
                type="text"
                value={witnessRole}
                onChange={(e) => setWitnessRole(e.target.value)}
                className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#17212B] focus:outline-none focus:border-[#1769AA]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[#64717D] block mb-1">Division / Unit</label>
            <input
              type="text"
              value={witnessDivision}
              onChange={(e) => setWitnessDivision(e.target.value)}
              className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs text-[#17212B] focus:outline-none focus:border-[#1769AA]"
            />
          </div>
        </div>

        <div className="p-3 rounded-lg bg-[#FAFBFD] border border-[#EEF2F6] flex items-start gap-2 text-[11px] text-[#64717D]">
          <Lock className="w-3.5 h-3.5 text-[#1769AA] shrink-0 mt-0.5" />
          <p className="leading-snug">
            Applying this co-witness seal links the secondary officer's identity into the digital evidence record seal hash. Both signatures are immutably preserved in the timeline.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#EEF2F6]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-[#F8FAFC] text-[#64717D] text-xs font-medium rounded-lg border border-[#CBD5E1] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSeal}
            disabled={saving}
            className="px-5 py-2 bg-[#16865B] hover:bg-[#13714C] text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{saving ? 'Generating Seal...' : 'Apply Dual-Witness Seal'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
