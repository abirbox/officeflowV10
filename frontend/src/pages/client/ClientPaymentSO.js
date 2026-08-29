import { useEffect, useState, useCallback } from 'react';
import { api, formatApiErrorDetail } from '@/lib/axios';
import { useAppSettings } from '@/contexts/AppSettingsContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import {
  Search, FileDown, FileSpreadsheet, Plus, ArrowLeft, Eye, Pencil, Trash2,
} from 'lucide-react';

const emptyComp = () => ({ date: '', amount: '' });
const emptyForm = () => ({ officer: null, w2: emptyComp(), w9_direct_deposit: emptyComp(), w9_zelle: emptyComp() });
const normComp = (c) => ({ date: (c || {}).date || '', amount: (c || {}).amount == null || c.amount === '' ? '' : String(c.amount) });
const toPayload = (c) => ({ date: c.date || null, amount: Number(c.amount) || 0 });

const ClientPaymentSO = () => {
  const [officer, setOfficer] = useState(null);
  if (officer) return <OfficerDetail officer={officer} onBack={() => setOfficer(null)} />;
  return <ClientView onOpenOfficer={setOfficer} />;
};

/* --------------------------- Client (list) view ------------------------- */
const ClientView = ({ onOpenOfficer }) => {
  const { settings } = useAppSettings();
  const cur = settings?.currency_symbol || '$';
  const money = (n) => `${cur}${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [ctx, setCtx] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    api.get('/portal/payments', { params })
      .then(({ data }) => setCtx(data))
      .catch(() => setCtx(null))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  const download = async (fmt) => {
    try {
      const res = await api.get(`/portal/payments/report/${fmt}`, {
        params: search ? { search } : {}, responseType: 'blob',
      });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `Payments.${fmt}`; a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { toast.error('Download failed'); }
  };

  const rows = ctx?.rows || [];
  const totals = ctx?.totals;

  return (
    <div className="space-y-6" data-testid="client-payment-so">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A] dark:text-[#FAFAFA]">Payment (SO)</h1>
          <p className="text-[#64748B] dark:text-[#A1A1AA] mt-1">Record and manage payment entries for your Security Officers.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => download('pdf')} data-testid="payments-pdf"><FileDown className="w-4 h-4 mr-1" /> PDF</Button>
          <Button variant="outline" onClick={() => download('xlsx')} data-testid="payments-xlsx"><FileSpreadsheet className="w-4 h-4 mr-1" /> Excel</Button>
          <Button className="bg-[#4F46E5] hover:bg-[#4338CA]" onClick={() => setDialogOpen(true)} data-testid="payment-add-new"><Plus className="w-4 h-4 mr-1" /> Add New Payment</Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#64748B]" />
        <Input placeholder="Search officers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" data-testid="payment-search" />
      </div>

      <div className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] dark:bg-[#0F0F11] text-left text-xs uppercase tracking-wider text-[#64748B]">
            <tr>
              <th className="px-4 py-3">Officer</th>
              <th className="px-4 py-3 text-right">W2</th>
              <th className="px-4 py-3 text-right">W9 Total</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Entries</th>
              <th className="px-4 py-3 text-right">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#27272A]">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No payment records yet. Click <b>Add New Payment</b>.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.officer_id} data-testid={`payment-row-${r.officer_id}`}>
                <td className="px-4 py-3 font-medium text-[#0F172A] dark:text-[#FAFAFA]">
                  <button onClick={() => onOpenOfficer(r)} className="text-[#4F46E5] hover:underline" data-testid={`payment-officer-name-${r.officer_id}`}>{r.officer_name}</button>
                </td>
                <td className="px-4 py-3 text-right text-[#334155] dark:text-[#E4E4E7]">{money(r.w2_amount)}</td>
                <td className="px-4 py-3 text-right text-[#334155] dark:text-[#E4E4E7]">{money(r.w9_total)}</td>
                <td className="px-4 py-3 text-right font-semibold text-emerald-600">{money(r.total)}</td>
                <td className="px-4 py-3 text-right text-[#334155] dark:text-[#E4E4E7]">{r.entries}</td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => onOpenOfficer(r)} data-testid={`payment-view-${r.officer_id}`}><Eye className="w-4 h-4 mr-1" /> Manage</Button>
                </td>
              </tr>
            ))}
          </tbody>
          {totals && rows.length > 0 && (
            <tfoot>
              <tr className="bg-[#F8FAFC] dark:bg-[#0F0F11] font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">{money(totals.w2)}</td>
                <td className="px-4 py-3 text-right">{money(totals.w9_total)}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{money(totals.grand_total)}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {dialogOpen && (
        <PaymentDialog open={dialogOpen} setOpen={setDialogOpen} onSaved={() => { setDialogOpen(false); load(); }} />
      )}
    </div>
  );
};

/* --------------------------- Officer detail view ------------------------ */
const OfficerDetail = ({ officer, onBack }) => {
  const { settings } = useAppSettings();
  const cur = settings?.currency_symbol || '$';
  const money = (n) => `${cur}${(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const [ctx, setCtx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/portal/payments/officer/${officer.officer_id}`)
      .then(({ data }) => setCtx(data))
      .catch(() => setCtx(null))
      .finally(() => setLoading(false));
  }, [officer.officer_id]);

  useEffect(() => { load(); }, [load]);

  const records = ctx?.records || [];
  const totals = ctx?.totals || {};

  const download = async (fmt) => {
    try {
      const res = await api.get(`/portal/payments/officer/${officer.officer_id}/report/${fmt}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `Payment-${(officer.officer_name || 'officer').replace(/\s+/g, '-')}.${fmt}`; a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) { toast.error('Download failed'); }
  };

  const removeRecord = async (r) => {
    if (!window.confirm(`Delete this payment entry (${r.date || 'no date'})?`)) return;
    try {
      await api.delete(`/portal/payments/records/${r.id}`);
      toast.success('Entry deleted');
      load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const fixedOfficer = { id: officer.officer_id, name: officer.officer_name, officer_code: officer.officer_code };

  return (
    <div className="space-y-6" data-testid="client-payment-officer-detail">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onBack} data-testid="payment-officer-back"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          <div>
            <h1 className="text-2xl font-bold text-[#0F172A] dark:text-[#FAFAFA]">{officer.officer_name}</h1>
            <p className="text-sm text-[#64748B]">Payment history</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => download('pdf')} data-testid="payment-officer-pdf"><FileDown className="w-4 h-4 mr-1" /> PDF</Button>
          <Button variant="outline" onClick={() => download('xlsx')} data-testid="payment-officer-xlsx"><FileSpreadsheet className="w-4 h-4 mr-1" /> Excel</Button>
          <Button className="bg-[#4F46E5] hover:bg-[#4338CA]" onClick={() => { setEditingRecord(null); setDialogOpen(true); }} data-testid="payment-officer-add"><Plus className="w-4 h-4 mr-1" /> Add Payment</Button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#18181B] border border-[#E2E8F0] dark:border-[#27272A] rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#F8FAFC] dark:bg-[#0F0F11] text-left text-xs uppercase tracking-wider text-[#64748B]">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">W2</th>
              <th className="px-4 py-3 text-right">W9 DD</th>
              <th className="px-4 py-3 text-right">W9 Zelle</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#27272A]">
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">Loading...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">No entries yet. Click <b>Add Payment</b>.</td></tr>
            ) : records.map((r) => (
              <tr key={r.id} data-testid={`payment-entry-${r.id}`}>
                <td className="px-4 py-3">{r.date || '—'}</td>
                <td className="px-4 py-3 text-right">{money(r.w2_amount)}</td>
                <td className="px-4 py-3 text-right">{money(r.w9_direct_deposit_amount)}</td>
                <td className="px-4 py-3 text-right">{money(r.w9_zelle_amount)}</td>
                <td className="px-4 py-3 text-right font-semibold">{money(r.total)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <Button size="sm" variant="outline" onClick={() => { setEditingRecord(r); setDialogOpen(true); }} data-testid={`payment-entry-edit-${r.id}`}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => removeRecord(r)} className="ml-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20" data-testid={`payment-entry-delete-${r.id}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
          {records.length > 0 && (
            <tfoot>
              <tr className="bg-[#F8FAFC] dark:bg-[#0F0F11] font-semibold">
                <td className="px-4 py-3">Total</td>
                <td className="px-4 py-3 text-right">{money(totals.w2)}</td>
                <td className="px-4 py-3 text-right">{money(totals.w9_direct_deposit)}</td>
                <td className="px-4 py-3 text-right">{money(totals.w9_zelle)}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{money(totals.grand_total)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {dialogOpen && (
        <PaymentDialog open={dialogOpen} setOpen={setDialogOpen} fixedOfficer={fixedOfficer} editingRecord={editingRecord} onSaved={() => { setDialogOpen(false); load(); }} />
      )}
    </div>
  );
};

/* --------------------------- Add / Edit dialog -------------------------- */
const PaymentDialog = ({ open, setOpen, fixedOfficer, editingRecord, onSaved }) => {
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingRecord) {
      setForm({
        officer: fixedOfficer,
        w2: normComp(editingRecord.w2),
        w9_direct_deposit: normComp(editingRecord.w9_direct_deposit),
        w9_zelle: normComp(editingRecord.w9_zelle),
      });
    } else {
      setForm({ ...emptyForm(), officer: fixedOfficer || null });
    }
  }, [editingRecord, fixedOfficer, open]);

  const setComp = (row, patch) => setForm((prev) => ({ ...prev, [row]: { ...prev[row], ...patch } }));

  const save = async () => {
    if (!form.officer) { toast.error('Select a Security Officer'); return; }
    const amounts = [form.w2.amount, form.w9_direct_deposit.amount, form.w9_zelle.amount].map((a) => Number(a) || 0);
    if (amounts.every((a) => a <= 0)) { toast.error('Enter an amount for at least one payment type'); return; }
    setSaving(true);
    try {
      const body = {
        officer_id: form.officer.id,
        w2: toPayload(form.w2),
        w9_direct_deposit: toPayload(form.w9_direct_deposit),
        w9_zelle: toPayload(form.w9_zelle),
      };
      if (editingRecord) await api.put(`/portal/payments/records/${editingRecord.id}`, body);
      else await api.post('/portal/payments/records', body);
      toast.success(editingRecord ? 'Payment updated' : 'Payment saved');
      onSaved();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="payment-dialog">
        <DialogHeader>
          <DialogTitle>{editingRecord ? 'Update Payment' : 'Add New Payment'}</DialogTitle>
          <DialogDescription>Record the W2 and W9 payments for one of your Security Officers.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Security Officer *</Label>
            {fixedOfficer ? (
              <div className="mt-1 px-3 py-2 rounded-md border border-[#E2E8F0] dark:border-[#27272A] bg-[#F8FAFC] dark:bg-[#27272A] text-sm" data-testid="payment-officer-fixed">
                {form.officer?.name} · <span className="font-mono">{form.officer?.officer_code || '—'}</span>
              </div>
            ) : (
              <OfficerSearch selected={form.officer} onSelect={(o) => setForm((prev) => ({ ...prev, officer: o }))} />
            )}
          </div>

          <div className="border border-[#E2E8F0] dark:border-[#27272A] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#F8FAFC] dark:bg-[#0F0F11] text-xs uppercase tracking-wider text-[#64748B]">
                <tr>
                  <th className="px-3 py-2 text-left">Payment Type</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#27272A]">
                <PayRow label="W2" testid="w2" comp={form.w2} onChange={(p) => setComp('w2', p)} />
                <PayRow label="W9 — Direct Deposit" testid="dd" comp={form.w9_direct_deposit} onChange={(p) => setComp('w9_direct_deposit', p)} />
                <PayRow label="W9 — Zelle Transfer" testid="zelle" comp={form.w9_zelle} onChange={(p) => setComp('w9_zelle', p)} />
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-[#4F46E5] hover:bg-[#4338CA]" data-testid="payment-submit">
            {saving ? 'Saving…' : (editingRecord ? 'Update' : 'Submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PayRow = ({ label, testid, comp, onChange }) => (
  <tr>
    <td className="px-3 py-2 font-medium text-[#0F172A] dark:text-[#FAFAFA] whitespace-nowrap">{label}</td>
    <td className="px-3 py-2">
      <Input type="date" value={comp.date || ''} onChange={(e) => onChange({ date: e.target.value })} className="h-9" data-testid={`payment-${testid}-date`} />
    </td>
    <td className="px-3 py-2">
      <Input type="number" step="0.01" min="0" value={comp.amount ?? ''} onChange={(e) => onChange({ amount: e.target.value })} placeholder="0.00" className="h-9 text-right" data-testid={`payment-${testid}-amount`} />
    </td>
  </tr>
);

const OfficerSearch = ({ selected, onSelect }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let dead = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/portal/payments/officers/search', { params: { q } });
        if (!dead) setResults(data || []);
      } catch (e) { if (!dead) setResults([]); }
      finally { if (!dead) setLoading(false); }
    }, 250);
    return () => { dead = true; clearTimeout(t); };
  }, [q, open]);

  return (
    <div className="relative">
      <Input
        value={selected ? `${selected.name} · ${selected.officer_code || ''}` : q}
        onChange={(e) => { onSelect(null); setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search by name, code, email or phone..."
        data-testid="payment-officer-search-input"
        autoComplete="off"
      />
      {open && !selected && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-md border border-[#E2E8F0] dark:border-[#27272A] bg-white dark:bg-[#18181B] shadow-lg" data-testid="payment-officer-results">
          {loading && <div className="px-3 py-2 text-sm text-[#64748B]">Searching…</div>}
          {!loading && results.length === 0 && <div className="px-3 py-2 text-sm text-[#64748B]">No officers found.</div>}
          {results.map((o) => (
            <button key={o.id} type="button" onClick={() => { onSelect(o); setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-[#F8FAFC] dark:hover:bg-[#27272A] text-sm" data-testid={`payment-officer-option-${o.id}`}>
              <div className="font-medium text-[#0F172A] dark:text-[#FAFAFA]">{o.name} <span className="font-mono text-xs text-[#64748B]">{o.officer_code}</span></div>
              <div className="text-xs text-[#64748B]">{[o.email, o.contact_number, o.social_security_code].filter(Boolean).join(' · ') || '—'}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ClientPaymentSO;
